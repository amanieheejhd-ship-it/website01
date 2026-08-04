import { ValidationError } from '@fardeen/shared';
import { BudgetRange } from './budget-range.vo';

describe('BudgetRange', () => {
  it('constructs with a valid range and defaults currency to INR', () => {
    const b = BudgetRange.of(1000, 5000);
    expect(b.min).toBe(1000);
    expect(b.max).toBe(5000);
    expect(b.currency).toBe('INR');
  });

  it('honours an explicit currency', () => {
    expect(BudgetRange.of(1, 2, 'USD').currency).toBe('USD');
  });

  it('rounds min and max', () => {
    const b = BudgetRange.of(10.4, 20.6);
    expect(b.min).toBe(10);
    expect(b.max).toBe(21);
  });

  it('allows min === max', () => {
    expect(() => BudgetRange.of(100, 100)).not.toThrow();
  });

  it('rejects a negative min', () => {
    expect(() => BudgetRange.of(-1, 100)).toThrow(ValidationError);
  });

  it('rejects max < min', () => {
    expect(() => BudgetRange.of(500, 100)).toThrow(ValidationError);
  });
});
