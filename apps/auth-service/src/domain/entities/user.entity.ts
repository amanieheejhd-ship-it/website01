import { ForbiddenError } from '@fardeen/shared';
import type { Role, UserStatus } from '@fardeen/types';
import { Email } from '../value-objects/email.vo';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

/**
 * User aggregate root (docs/DOMAIN-MODEL.md §Identity). Rich behavior, no framework/ORM imports.
 * Invariant: one active credential per email is enforced by the RegisterUser use-case via the
 * repository (existsByEmail) — the aggregate guards its own state transitions.
 */
export class User {
  private constructor(private props: UserProps) {}

  static register(input: {
    id: string;
    email: Email;
    passwordHash: string;
    role?: Role;
    createdAt: Date;
  }): User {
    return new User({
      id: input.id,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role ?? 'visitor',
      status: 'active',
      createdAt: input.createdAt,
    });
  }

  /** Reconstruct from persistence (repository). */
  static rehydrate(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get role(): Role {
    return this.props.role;
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  /**
   * Verify a plaintext password against the stored hash using a caller-supplied comparator
   * (the PasswordHasher port lives in the application/infrastructure layers — the domain stays
   * free of any hashing library). An inactive user never authenticates.
   */
  async verifyPassword(
    plain: string,
    compare: (plain: string, hash: string) => Promise<boolean>,
  ): Promise<boolean> {
    if (!this.isActive()) return false;
    return compare(plain, this.props.passwordHash);
  }

  changeRole(role: Role): void {
    if (!this.isActive()) {
      throw new ForbiddenError('Cannot change the role of an inactive user');
    }
    this.props.role = role;
  }

  deactivate(): void {
    this.props.status = 'inactive';
  }
}
