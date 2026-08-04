import { err, ok, type RefreshPayload, type RefreshResult, type Result } from '@fardeen/types';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { RefreshSessionStore } from '../ports/refresh-session.store';
import type { TokenSigner } from '../ports/token-signer.port';
import { toErr } from '../result.util';

/**
 * Rotate the refresh token on every use. REUSE DETECTION: presenting a token that exists but is no
 * longer active means it was already rotated (or replayed) → revoke the entire family.
 */
export class RefreshToken {
  constructor(
    private readonly sessions: RefreshSessionStore,
    private readonly users: UserRepository,
    private readonly signer: TokenSigner,
  ) {}

  async execute(payload: RefreshPayload): Promise<Result<RefreshResult>> {
    try {
      const rec = await this.sessions.get(payload.refreshToken);
      if (!rec) {
        return err({ code: 'REFRESH_INVALID', message: 'Invalid refresh token' });
      }
      if (!rec.active) {
        await this.sessions.revokeFamily(rec.familyId);
        return err({ code: 'REFRESH_REUSE', message: 'Refresh token reuse detected; session family revoked' });
      }
      if (rec.expiresAt <= new Date()) {
        return err({ code: 'REFRESH_INVALID', message: 'Refresh token expired' });
      }

      await this.sessions.markRotated(payload.refreshToken);

      const user = await this.users.findById(rec.userId);
      if (!user || !user.isActive()) {
        await this.sessions.revokeFamily(rec.familyId);
        return err({ code: 'UNAUTHORIZED', message: 'User is no longer active' });
      }

      const issued = await this.sessions.issue({
        userId: user.id,
        familyId: rec.familyId,
        userAgent: payload.userAgent,
      });
      const access = await this.signer.sign({ id: user.id, email: user.email.value, role: user.role });

      return ok({ access, refreshToken: issued.token });
    } catch (e) {
      return toErr(e);
    }
  }
}
