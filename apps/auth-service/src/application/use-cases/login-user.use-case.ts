import { err, ok, type LoginPayload, type LoginResult, type Result } from '@fardeen/types';
import { Email } from '../../domain/value-objects/email.vo';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { PasswordHasher } from '../ports/password-hasher.port';
import type { RefreshSessionStore } from '../ports/refresh-session.store';
import type { TokenSigner } from '../ports/token-signer.port';
import { toUserProfile } from '../mappers/user.mapper';
import { toErr } from '../result.util';

export class LoginUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly signer: TokenSigner,
    private readonly sessions: RefreshSessionStore,
  ) {}

  async execute(payload: LoginPayload): Promise<Result<LoginResult>> {
    try {
      const invalid = err({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
      const email = Email.create(payload.email);
      const user = await this.users.findByEmail(email);
      if (!user) return invalid;

      const matches = await user.verifyPassword(payload.password, (p, h) => this.hasher.compare(p, h));
      if (!matches) return invalid;

      const access = await this.signer.sign({ id: user.id, email: user.email.value, role: user.role });
      const refresh = await this.sessions.issue({ userId: user.id, userAgent: payload.userAgent });

      return ok({ access, refreshToken: refresh.token, profile: toUserProfile(user) });
    } catch (e) {
      return toErr(e);
    }
  }
}
