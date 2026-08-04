import type { Email } from '../value-objects/email.vo';
import type { User } from '../entities/user.entity';

/** Repository port (interface). The Prisma adapter implements it in the infrastructure layer. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  save(user: User): Promise<void>;
}
