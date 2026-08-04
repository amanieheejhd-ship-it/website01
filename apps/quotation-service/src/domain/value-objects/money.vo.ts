import { ValidationError } from '@fardeen/shared';

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {}

  static of(amount: number, currency = 'INR'): Money {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new ValidationError('Invalid money amount');
    }
    return new Money(Math.round(amount), currency);
  }
}
