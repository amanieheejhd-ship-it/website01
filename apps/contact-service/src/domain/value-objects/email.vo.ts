import { ValidationError } from '@fardeen/shared';

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ValidationError(`Invalid email address: ${raw}`);
    }
    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }
}
