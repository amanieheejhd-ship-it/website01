import { ValidationError } from '@fardeen/shared';
import { Email } from './email.vo';

describe('Email value object', () => {
  it('normalizes by trimming and lowercasing', () => {
    const email = Email.create('  Jane.Doe@Example.COM  ');
    expect(email.value).toBe('jane.doe@example.com');
    expect(email.toString()).toBe('jane.doe@example.com');
  });

  it.each(['not-an-email', 'missing@domain', '@no-local.com', 'a@b', 'has space@x.com', ''])(
    'rejects malformed address %p',
    (raw) => {
      expect(() => Email.create(raw)).toThrow(ValidationError);
    },
  );
});
