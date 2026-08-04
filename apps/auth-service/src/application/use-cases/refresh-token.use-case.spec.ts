import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { TokenSigner } from '../ports/token-signer.port';
import type { RefreshSessionStore, RefreshRecord } from '../ports/refresh-session.store';
import { RefreshToken } from './refresh-token.use-case';

const FUTURE = new Date('2999-01-01T00:00:00Z');
const PAST = new Date('2000-01-01T00:00:00Z');

const makeMocks = () => {
  const sessions: jest.Mocked<RefreshSessionStore> = {
    issue: jest.fn().mockResolvedValue({ token: 'rotated-token', familyId: 'fam-1', expiresAt: FUTURE }),
    get: jest.fn(),
    markRotated: jest.fn().mockResolvedValue(undefined),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
  };
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
  };
  const signer: jest.Mocked<TokenSigner> = {
    sign: jest.fn().mockResolvedValue({ accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900 }),
  };
  return { sessions, users, signer };
};

const activeRecord = (): RefreshRecord => ({
  userId: 'u1',
  familyId: 'fam-1',
  active: true,
  expiresAt: FUTURE,
});

const activeUser = () =>
  User.register({
    id: 'u1',
    email: Email.create('user@example.com'),
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

describe('RefreshToken use-case', () => {
  it('returns REFRESH_INVALID when the token is unknown', async () => {
    const { sessions, users, signer } = makeMocks();
    sessions.get.mockResolvedValue(null);
    const result = await new RefreshToken(sessions, users, signer).execute({ refreshToken: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('REFRESH_INVALID');
    expect(sessions.revokeFamily).not.toHaveBeenCalled();
  });

  it('detects reuse of an already-rotated token: revokes the family and returns REFRESH_REUSE', async () => {
    const { sessions, users, signer } = makeMocks();
    sessions.get.mockResolvedValue({ ...activeRecord(), active: false });
    const result = await new RefreshToken(sessions, users, signer).execute({ refreshToken: 'old' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('REFRESH_REUSE');
    expect(sessions.revokeFamily).toHaveBeenCalledWith('fam-1');
    expect(sessions.markRotated).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('returns REFRESH_INVALID when the session has expired', async () => {
    const { sessions, users, signer } = makeMocks();
    sessions.get.mockResolvedValue({ ...activeRecord(), expiresAt: PAST });
    const result = await new RefreshToken(sessions, users, signer).execute({ refreshToken: 'stale' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('REFRESH_INVALID');
    expect(sessions.markRotated).not.toHaveBeenCalled();
  });

  it('on a valid token rotates it: marks rotated, issues a NEW token, and signs a fresh access token', async () => {
    const { sessions, users, signer } = makeMocks();
    sessions.get.mockResolvedValue(activeRecord());
    users.findById.mockResolvedValue(activeUser());
    const result = await new RefreshToken(sessions, users, signer).execute({
      refreshToken: 'current-token',
      userAgent: 'jest-agent',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.refreshToken).toBe('rotated-token');
      expect(result.data.access.accessToken).toBe('jwt');
    }
    expect(sessions.markRotated).toHaveBeenCalledWith('current-token');
    expect(sessions.issue).toHaveBeenCalledWith({
      userId: 'u1',
      familyId: 'fam-1',
      userAgent: 'jest-agent',
    });
    expect(sessions.revokeFamily).not.toHaveBeenCalled();
  });

  it('revokes the family and returns UNAUTHORIZED when the user is gone/inactive after rotation', async () => {
    const { sessions, users, signer } = makeMocks();
    sessions.get.mockResolvedValue(activeRecord());
    users.findById.mockResolvedValue(null);
    const result = await new RefreshToken(sessions, users, signer).execute({ refreshToken: 'current-token' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHORIZED');
    expect(sessions.markRotated).toHaveBeenCalledWith('current-token');
    expect(sessions.revokeFamily).toHaveBeenCalledWith('fam-1');
    expect(sessions.issue).not.toHaveBeenCalled();
  });
});
