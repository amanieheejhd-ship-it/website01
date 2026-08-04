import { randomUUID } from 'node:crypto';
import { EVENTS, err, ok, type RegisterPayload, type Result, type UserProfile } from '@fardeen/types';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { EventPublisher } from '../ports/event-publisher.port';
import type { PasswordHasher } from '../ports/password-hasher.port';
import { toUserProfile } from '../mappers/user.mapper';
import { toErr } from '../result.util';

/** Create a user (admin-gated at the gateway). Invariant: one active credential per email. */
export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: RegisterPayload): Promise<Result<UserProfile>> {
    try {
      const email = Email.create(payload.email);
      if (await this.users.existsByEmail(email)) {
        return err({ code: 'EMAIL_TAKEN', message: 'An account with this email already exists' });
      }
      const passwordHash = await this.hasher.hash(payload.password);
      const user = User.register({
        id: randomUUID(),
        email,
        passwordHash,
        role: payload.role,
        createdAt: new Date(),
      });
      await this.users.save(user);
      await this.events.publish({
        name: EVENTS.userRegistered,
        correlationId: payload.correlationId,
        data: { userId: user.id, email: user.email.value, role: user.role },
      });
      return ok(toUserProfile(user));
    } catch (e) {
      return toErr(e);
    }
  }
}
