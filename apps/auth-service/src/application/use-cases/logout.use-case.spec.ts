import type { RefreshSessionStore } from '../ports/refresh-session.store';
import { Logout } from './logout.use-case';

const makeSessions = (): jest.Mocked<RefreshSessionStore> => ({
  issue: jest.fn(),
  get: jest.fn(),
  markRotated: jest.fn(),
  revokeFamily: jest.fn().mockResolvedValue(undefined),
});

describe('Logout use-case', () => {
  it('revokes the whole family when the session exists', async () => {
    const sessions = makeSessions();
    sessions.get.mockResolvedValue({ userId: 'u1', familyId: 'fam-1', active: true, expiresAt: new Date() });
    const result = await new Logout(sessions).execute({ refreshToken: 'tok' });
    expect(result.ok).toBe(true);
    expect(sessions.revokeFamily).toHaveBeenCalledWith('fam-1');
  });

  it('is idempotent: succeeds without throwing when the session does not exist', async () => {
    const sessions = makeSessions();
    sessions.get.mockResolvedValue(null);
    const result = await new Logout(sessions).execute({ refreshToken: 'gone' });
    expect(result.ok).toBe(true);
    expect(sessions.revokeFamily).not.toHaveBeenCalled();
  });
});
