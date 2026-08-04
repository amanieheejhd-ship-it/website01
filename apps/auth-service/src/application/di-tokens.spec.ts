/**
 * Loads the DI-token symbols and event constants so the container-wiring contracts are asserted
 * (these modules are otherwise referenced only via erased `import type`s).
 */
import { AUTH_EVENTS } from '../domain/events/auth-events';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import { PASSWORD_HASHER } from './ports/password-hasher.port';
import { TOKEN_SIGNER } from './ports/token-signer.port';
import { REFRESH_SESSION_STORE } from './ports/refresh-session.store';
import { EVENT_PUBLISHER } from './ports/event-publisher.port';

describe('DI tokens & event constants', () => {
  it('every injection token is a distinct symbol', () => {
    const tokens = [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SIGNER, REFRESH_SESSION_STORE, EVENT_PUBLISHER];
    tokens.forEach((t) => expect(typeof t).toBe('symbol'));
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('exposes the auth event channel names', () => {
    expect(AUTH_EVENTS.userRegistered).toBe('user.registered');
    expect(AUTH_EVENTS.userRoleChanged).toBe('user.roleChanged');
  });
});
