import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../application/ports/password-hasher.port';

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
