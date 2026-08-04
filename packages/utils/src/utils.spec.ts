import { assertNever, clamp, formatINR, isDefined, slugify } from './index';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Skyline Villa')).toBe('skyline-villa');
  });
  it('strips diacritics via NFKD', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });
  it('collapses runs of non-alphanumerics and trims edges', () => {
    expect(slugify('  A & B -- C!  ')).toBe('a-b-c');
  });
  it('strips leading/trailing hyphens', () => {
    expect(slugify('--Hello--')).toBe('hello');
  });
  it('returns empty string for punctuation-only input', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('isDefined', () => {
  it('is false for null and undefined', () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
  it('is true for falsy-but-present values (0, "", false)', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
  });
});

describe('assertNever', () => {
  it('throws with the stringified value', () => {
    expect(() => assertNever('surprise' as never)).toThrow('Unexpected value: surprise');
  });
});

describe('clamp', () => {
  it('clamps below the minimum', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps above the maximum', () => expect(clamp(42, 0, 10)).toBe(10));
  it('passes values already in range', () => expect(clamp(5, 0, 10)).toBe(5));
  it('handles the boundaries inclusively', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('formatINR', () => {
  it('formats with the rupee symbol and Indian grouping', () => {
    const out = formatINR(125000);
    expect(out).toContain('₹');
    expect(out).toContain('1,25,000');
  });
  it('rounds away fractional paise (no decimal point)', () => {
    expect(formatINR(1000.75)).not.toContain('.');
  });
});
