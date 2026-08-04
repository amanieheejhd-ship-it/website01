import { ValidationError } from '@fardeen/shared';

/** Contact snapshot embedded in a quotation request. */
export class QuoteContact {
  private constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly phone: string,
  ) {}

  static create(input: { name: string; email: string; phone: string }): QuoteContact {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError(`Invalid contact email: ${input.email}`);
    }
    const phone = input.phone.replace(/[^\d+]/g, '');
    if (phone.replace(/\D/g, '').length < 7) {
      throw new ValidationError(`Invalid contact phone: ${input.phone}`);
    }
    if (!input.name.trim()) throw new ValidationError('Contact name is required');
    return new QuoteContact(input.name.trim(), email, phone);
  }
}
