import { ValidationError } from '@fardeen/shared';

export class BudgetRange {
  private constructor(
    public readonly min: number,
    public readonly max: number,
    public readonly currency: string,
  ) {}

  static of(min: number, max: number, currency = 'INR'): BudgetRange {
    if (min < 0 || max < min) {
      throw new ValidationError('Invalid budget range');
    }
    return new BudgetRange(Math.round(min), Math.round(max), currency);
  }
}
