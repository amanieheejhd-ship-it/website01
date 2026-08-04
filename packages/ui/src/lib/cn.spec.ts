import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class names with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });
  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });
  it('supports clsx conditional-object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
  it('resolves array inputs', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });
  it('merges conflicting Tailwind utilities, last one wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
  it('keeps non-conflicting Tailwind utilities', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });
});
