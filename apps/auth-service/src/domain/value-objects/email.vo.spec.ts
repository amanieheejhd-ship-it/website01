import { ValidationError } from '@fardeen/shared';
import { Email } from './email.vo';

describe('Email value object', () => {
  it('normalizes case and trims surrounding whitespace', () => {
    const email = Email.create('  Foo.Bar@Example.COM  ');
    expect(email.value).toBe('foo.bar@example.com');
    expect(email.toString()).toBe('foo.bar@example.com');
  });

  it('rejects a malformed address by throwing ValidationError', () => {
    expect(() => Email.create('not-an-email')).toThrow(ValidationError);
    expect(() => Email.create('missing@domain')).toThrow(ValidationError);
    expect(() => Email.create('has space@example.com')).toThrow(ValidationError);
    expect(() => Email.create('')).toThrow(ValidationError);
  });

  it('equals() compares by normalized value', () => {
    expect(Email.create('a@b.com').equals(Email.create('A@B.COM'))).toBe(true);
    expect(Email.create('a@b.com').equals(Email.create('c@b.com'))).toBe(false);
  });
});
