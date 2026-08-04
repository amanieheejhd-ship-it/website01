import { ok, type LogoutPayload, type Result } from '@fardeen/types';
import type { RefreshSessionStore } from '../ports/refresh-session.store';

/** Logout revokes the whole session family (all rotated tokens). Idempotent. */
export class Logout {
  constructor(private readonly sessions: RefreshSessionStore) {}

  async execute(payload: LogoutPayload): Promise<Result<{ ok: true }>> {
    const rec = await this.sessions.get(payload.refreshToken);
    if (rec) {
      await this.sessions.revokeFamily(rec.familyId);
    }
    return ok({ ok: true });
  }
}
