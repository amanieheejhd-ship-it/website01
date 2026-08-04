/**
 * Integration — the auth security core against REAL Postgres (auth_db_test) + REAL Redis.
 * Verifies RS256 sign→verify, login, refresh ROTATION, REUSE DETECTION with family revocation
 * (asserting the actual Redis keys are gone), and RBAC role claims.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import type Redis from 'ioredis';
import { Email } from '../domain/value-objects/email.vo';
import { User } from '../domain/entities/user.entity';
import { LoginUser } from '../application/use-cases/login-user.use-case';
import { RefreshToken } from '../application/use-cases/refresh-token.use-case';
import { makeRedis, testDbUrl, truncate } from '../../../../test/integration/support';
import { PrismaService } from './prisma/prisma.service';
import { PrismaUserRepository } from './prisma/user.repository.impl';
import { RedisRefreshSessionStore } from './redis/refresh-session.store.impl';
import { Rs256TokenSigner } from './crypto/token-signer.impl';
import { BcryptPasswordHasher } from './crypto/password-hasher.impl';

const ISSUER = 'fardeen-auth';
const AUDIENCE = 'fardeen-api';
const PASSWORD = 'Sup3r-Secret!';
const sha = (t: string) => createHash('sha256').update(t).digest('hex');
const tokKey = (t: string) => `auth:rt:tok:${sha(t)}`;

describe('Auth flow (integration · real Postgres auth_db_test + real Redis)', () => {
  let prisma: PrismaService;
  let redis: Redis;
  let users: PrismaUserRepository;
  let sessions: RedisRefreshSessionStore;
  let signer: Rs256TokenSigner;
  let hasher: BcryptPasswordHasher;
  let login: LoginUser;
  let refresh: RefreshToken;
  let publicKey: string;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('auth_db_test'));
    await prisma.$connect();
    redis = makeRedis();
    users = new PrismaUserRepository(prisma);
    sessions = new RedisRefreshSessionStore(redis, 1209600);
    signer = new Rs256TokenSigner({
      privateKey: readFileSync('secrets/jwt-private.pem', 'utf8'),
      ttlSeconds: 900,
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    hasher = new BcryptPasswordHasher(4); // low rounds → fast in tests
    publicKey = readFileSync('secrets/jwt-public.pem', 'utf8');
    login = new LoginUser(users, hasher, signer, sessions);
    refresh = new RefreshToken(sessions, users, signer);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), ['refresh_sessions', 'users']);
    const keys = await redis.keys('auth:rt:*');
    if (keys.length > 0) await redis.del(...keys);
  });

  async function seedUser(email: string, role: 'admin' | 'editor' | 'visitor' = 'admin'): Promise<User> {
    const user = User.register({
      id: randomUUID(),
      email: Email.create(email),
      passwordHash: await hasher.hash(PASSWORD),
      role,
      createdAt: new Date(),
    });
    await users.save(user);
    return user;
  }

  it('signs an RS256 access token that verifies with the public key and carries the RBAC role claim', async () => {
    const user = await seedUser('admin@test.local', 'admin');
    const access = await signer.sign({ id: user.id, email: user.email.value, role: user.role });

    const decoded = jwt.verify(access.accessToken, publicKey, {
      algorithms: ['RS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as jwt.JwtPayload;

    expect(decoded.sub).toBe(user.id);
    expect(decoded.email).toBe('admin@test.local');
    expect(decoded.role).toBe('admin'); // RBAC claim
    expect(decoded.type).toBe('access');
    expect(access.tokenType).toBe('Bearer');
  });

  it('login issues an access token + a refresh token persisted in real Redis', async () => {
    await seedUser('login@test.local', 'editor');
    const res = await login.execute({ email: 'login@test.local', password: PASSWORD });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.access.accessToken).toBeTruthy();
    expect(res.data.refreshToken).toBeTruthy();
    expect(res.data.profile.role).toBe('editor');
    // the refresh token really exists in Redis
    expect(await redis.exists(tokKey(res.data.refreshToken))).toBe(1);
    // and the access token's role claim round-trips
    const decoded = jwt.verify(res.data.access.accessToken, publicKey, { algorithms: ['RS256'], issuer: ISSUER, audience: AUDIENCE }) as jwt.JwtPayload;
    expect(decoded.role).toBe('editor');
  });

  it('returns a single INVALID_CREDENTIALS for unknown email and for a wrong password', async () => {
    await seedUser('real@test.local');
    const unknown = await login.execute({ email: 'nobody@test.local', password: PASSWORD });
    const wrong = await login.execute({ email: 'real@test.local', password: 'wrong' });
    expect(unknown.ok).toBe(false);
    expect(wrong.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.code).toBe('INVALID_CREDENTIALS');
    if (!wrong.ok) expect(wrong.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates the refresh token on use (old marked inactive in Redis, new one active)', async () => {
    await seedUser('rotate@test.local');
    const first = await login.execute({ email: 'rotate@test.local', password: PASSWORD });
    if (!first.ok) throw new Error('login failed');
    const tokenA = first.data.refreshToken;

    const rotated = await refresh.execute({ refreshToken: tokenA });
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    const tokenB = rotated.data.refreshToken;
    expect(tokenB).not.toBe(tokenA);

    // Assert against REAL Redis: A is now inactive, B is active, same family.
    const recA = await sessions.get(tokenA);
    const recB = await sessions.get(tokenB);
    expect(recA?.active).toBe(false);
    expect(recB?.active).toBe(true);
    expect(recB?.familyId).toBe(recA?.familyId);
  });

  it('detects reuse of a rotated token → revokes the WHOLE family in real Redis → REFRESH_REUSE', async () => {
    await seedUser('reuse@test.local');
    const first = await login.execute({ email: 'reuse@test.local', password: PASSWORD });
    if (!first.ok) throw new Error('login failed');
    const tokenA = first.data.refreshToken;
    const familyId = (await sessions.get(tokenA))!.familyId;

    const rotated = await refresh.execute({ refreshToken: tokenA });
    if (!rotated.ok) throw new Error('rotate failed');
    const tokenB = rotated.data.refreshToken;

    // Sanity: family keys exist before reuse.
    expect(await redis.exists(`auth:rt:fam:${familyId}`)).toBe(1);
    expect(await redis.exists(tokKey(tokenB))).toBe(1);

    // Replay the already-rotated token A → reuse detected.
    const reuse = await refresh.execute({ refreshToken: tokenA });
    expect(reuse.ok).toBe(false);
    if (!reuse.ok) expect(reuse.error.code).toBe('REFRESH_REUSE');

    // The ENTIRE family is gone from real Redis (family set + every token in it).
    expect(await redis.exists(`auth:rt:fam:${familyId}`)).toBe(0);
    expect(await redis.exists(tokKey(tokenA))).toBe(0);
    expect(await redis.exists(tokKey(tokenB))).toBe(0);

    // The still-"valid" rotated token B can no longer refresh (its key was revoked).
    const afterRevoke = await refresh.execute({ refreshToken: tokenB });
    expect(afterRevoke.ok).toBe(false);
    if (!afterRevoke.ok) expect(afterRevoke.error.code).toBe('REFRESH_INVALID');
  });
});
