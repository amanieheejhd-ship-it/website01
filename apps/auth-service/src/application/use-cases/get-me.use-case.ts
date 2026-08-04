import { err, ok, type MePayload, type Result, type UserProfile } from '@fardeen/types';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { toUserProfile } from '../mappers/user.mapper';

export class GetMe {
  constructor(private readonly users: UserRepository) {}

  async execute(payload: MePayload): Promise<Result<UserProfile>> {
    const user = await this.users.findById(payload.userId);
    if (!user) {
      return err({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    return ok(toUserProfile(user));
  }
}
