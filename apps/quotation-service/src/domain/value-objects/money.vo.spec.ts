import { ValidationError } from '@fardeen/shared';
import { Money } from './money.vo';

describe('Money', () => {
  it('constructs with a valid amount and defaults currency to INR', () => {
    const m = Money.of(1000);
    expect(m.amount).toBe(1000);
    expect(m.currency).toBe('INR');
  });

  it('honours an explicit currency', () => {
    expect(Money.of(500, 'USD').currency).toBe('USD');
  });

  it('rounds fractional amounts to the nearest integer', () => {
    expect(Money.of(10.4).amount).toBe(10);
    expect(Money.of(10.6).amount).toBe(11);
  });

  it('allows zero', () => {
    expect(Money.of(0).amount).toBe(0);
  });

  it('rejects negative amounts', () => {
    expect(() => Money.of(-1)).toThrow(ValidationError);
  });

  it('rejects non-finite amounts', () => {
    expect(() => Money.of(Number.NaN)).toThrow(ValidationError);
    expect(() => Money.of(Number.POSITIVE_INFINITY)).toThrow(ValidationError);
  });
});
