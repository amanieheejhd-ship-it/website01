import { ValidationError } from '@fardeen/shared';
import { Money } from './money.vo';

describe('Money value object', () => {
  it('constructs a valid amount with explicit currency', () => {
    const m = Money.of(1500, 'USD');
    expect(m.amount).toBe(1500);
    expect(m.currency).toBe('USD');
  });

  it('defaults currency to INR', () => {
    expect(Money.of(1000).currency).toBe('INR');
  });

  it('allows zero', () => {
    expect(Money.of(0).amount).toBe(0);
  });

  it('rounds fractional minor units to the nearest integer', () => {
    expect(Money.of(10.4).amount).toBe(10);
    expect(Money.of(10.5).amount).toBe(11);
    expect(Money.of(10.6).amount).toBe(11);
  });

  it('rejects negative amounts', () => {
    expect(() => Money.of(-1)).toThrow(ValidationError);
  });

  it('rejects non-finite amounts (NaN / Infinity)', () => {
    expect(() => Money.of(Number.NaN)).toThrow(ValidationError);
    expect(() => Money.of(Number.POSITIVE_INFINITY)).toThrow(ValidationError);
  });
});
