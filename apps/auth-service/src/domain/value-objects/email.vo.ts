import { ValidationError } from '@fardeen/shared';

/** Email value object — normalized + shape-guarded. Full-format validation also happens at the
 *  gateway's Zod edge; this guards the domain invariant regardless of caller. */
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ValidationError(`Invalid email address: ${raw}`);
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
