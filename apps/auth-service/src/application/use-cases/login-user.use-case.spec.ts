import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { PasswordHasher } from '../ports/password-hasher.port';
import type { TokenSigner } from '../ports/token-signer.port';
import type { RefreshSessionStore } from '../ports/refresh-session.store';
import { LoginUser } from './login-user.use-case';

const makeMocks = () => {
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasher> = { hash: jest.fn(), compare: jest.fn() };
  const signer: jest.Mocked<TokenSigner> = {
    sign: jest.fn().mockResolvedValue({ accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900 }),
  };
  const sessions: jest.Mocked<RefreshSessionStore> = {
    issue: jest.fn().mockResolvedValue({ token: 'refresh-1', familyId: 'fam-1', expiresAt: new Date() }),
    get: jest.fn(),
    markRotated: jest.fn(),
    revokeFamily: jest.fn(),
  };
  return { users, hasher, signer, sessions };
};

const activeUser = () =>
  User.register({
    id: 'u1',
    email: Email.create('user@example.com'),
    passwordHash: 'stored-hash',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

const inactiveUser = () =>
  User.rehydrate({
    id: 'u1',
    email: Email.create('user@example.com'),
    passwordHash: 'stored-hash',
    role: 'visitor',
    status: 'inactive',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

describe('LoginUser use-case', () => {
  it('returns INVALID_CREDENTIALS for an unknown email', async () => {
    const { users, hasher, signer, sessions } = makeMocks();
    users.findByEmail.mockResolvedValue(null);
    const result = await new LoginUser(users, hasher, signer, sessions).execute({
      email: 'unknown@example.com',
      password: 'password123',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_CREDENTIALS');
    expect(hasher.compare).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('returns INVALID_CREDENTIALS for a wrong password', async () => {
    const { users, hasher, signer, sessions } = makeMocks();
    users.findByEmail.mockResolvedValue(activeUser());
    hasher.compare.mockResolvedValue(false);
    const result = await new LoginUser(users, hasher, signer, sessions).execute({
      email: 'user@example.com',
      password: 'wrong-pw',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_CREDENTIALS');
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('returns INVALID_CREDENTIALS for an inactive user (comparator never called)', async () => {
    const { users, hasher, signer, sessions } = makeMocks();
    users.findByEmail.mockResolvedValue(inactiveUser());
    const result = await new LoginUser(users, hasher, signer, sessions).execute({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_CREDENTIALS');
    expect(hasher.compare).not.toHaveBeenCalled();
  });

  it('all three failure modes surface the SAME error code', async () => {
    const codes: string[] = [];
    for (const setup of [
      (m: ReturnType<typeof makeMocks>) => m.users.findByEmail.mockResolvedValue(null),
      (m: ReturnType<typeof makeMocks>) => {
        m.users.findByEmail.mockResolvedValue(activeUser());
        m.hasher.compare.mockResolvedValue(false);
      },
      (m: ReturnType<typeof makeMocks>) => m.users.findByEmail.mockResolvedValue(inactiveUser()),
    ]) {
      const m = makeMocks();
      setup(m);
      const res = await new LoginUser(m.users, m.hasher, m.signer, m.sessions).execute({
        email: 'user@example.com',
        password: 'password123',
      });
      if (!res.ok) codes.push(res.error.code);
    }
    expect(codes).toEqual(['INVALID_CREDENTIALS', 'INVALID_CREDENTIALS', 'INVALID_CREDENTIALS']);
  });

  it('on success signs an access token, issues a refresh session, and returns the profile', async () => {
    const { users, hasher, signer, sessions } = makeMocks();
    users.findByEmail.mockResolvedValue(activeUser());
    hasher.compare.mockResolvedValue(true);
    const result = await new LoginUser(users, hasher, signer, sessions).execute({
      email: 'user@example.com',
      password: 'password123',
      userAgent: 'jest-agent',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.access.accessToken).toBe('jwt');
      expect(result.data.refreshToken).toBe('refresh-1');
      expect(result.data.profile.email).toBe('user@example.com');
    }
    expect(signer.sign).toHaveBeenCalledWith({ id: 'u1', email: 'user@example.com', role: 'visitor' });
    expect(sessions.issue).toHaveBeenCalledWith({ userId: 'u1', userAgent: 'jest-agent' });
  });
});
