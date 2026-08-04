import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import type {
  IssuedRefresh,
  RefreshRecord,
  RefreshSessionStore,
} from '../../application/ports/refresh-session.store';

interface StoredRecord {
  userId: string;
  familyId: string;
  active: boolean;
  expiresAt: string;
  userAgent?: string;
}

/**
 * Redis-backed refresh-session store. Only the SHA-256 hash of the opaque token is stored. Rotated
 * tokens are kept (active=false) so the RefreshToken use-case can detect reuse; revokeFamily nukes
 * every token in the family.
 */
export class RedisRefreshSessionStore implements RefreshSessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private tokKey(hash: string): string {
    return `auth:rt:tok:${hash}`;
  }
  private famKey(familyId: string): string {
    return `auth:rt:fam:${familyId}`;
  }

  async issue(input: { userId: string; familyId?: string; userAgent?: string }): Promise<IssuedRefresh> {
    const familyId = input.familyId ?? randomUUID();
    const token = randomBytes(32).toString('hex');
    const hash = this.hash(token);
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const record: StoredRecord = {
      userId: input.userId,
      familyId,
      active: true,
      expiresAt: expiresAt.toISOString(),
      userAgent: input.userAgent,
    };
    const storeTtl = this.ttlSeconds + 60;
    await this.redis.set(this.tokKey(hash), JSON.stringify(record), 'EX', storeTtl);
    await this.redis.sadd(this.famKey(familyId), hash);
    await this.redis.expire(this.famKey(familyId), storeTtl);
    return { token, familyId, expiresAt };
  }

  async get(token: string): Promise<RefreshRecord | null> {
    const raw = await this.redis.get(this.tokKey(this.hash(token)));
    if (!raw) return null;
    const r = JSON.parse(raw) as StoredRecord;
    return { userId: r.userId, familyId: r.familyId, active: r.active, expiresAt: new Date(r.expiresAt) };
  }

  async markRotated(token: string): Promise<void> {
    const key = this.tokKey(this.hash(token));
    const raw = await this.redis.get(key);
    if (!raw) return;
    const r = JSON.parse(raw) as StoredRecord;
    r.active = false;
    const ttl = await this.redis.ttl(key);
    await this.redis.set(key, JSON.stringify(r), 'EX', ttl > 0 ? ttl : 60);
  }

  async revokeFamily(familyId: string): Promise<void> {
    const famKey = this.famKey(familyId);
    const members = await this.redis.smembers(famKey);
    if (members.length > 0) {
      await this.redis.del(...members.map((h) => this.tokKey(h)));
    }
    await this.redis.del(famKey);
  }
}
