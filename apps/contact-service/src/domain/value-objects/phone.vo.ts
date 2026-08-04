import { ValidationError } from '@fardeen/shared';

/** Phone value object — keeps digits and a leading '+'; requires ≥7 digits. */
export class Phone {
  private constructor(public readonly value: string) {}

  static create(raw: string): Phone {
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (cleaned.replace(/\D/g, '').length < 7) {
      throw new ValidationError(`Invalid phone number: ${raw}`);
    }
    return new Phone(cleaned);
  }

  toString(): string {
    return this.value;
  }
}
