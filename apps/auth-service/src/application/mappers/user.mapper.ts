import type { UserProfile } from '@fardeen/types';
import type { User } from '../../domain/entities/user.entity';

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email.value,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
