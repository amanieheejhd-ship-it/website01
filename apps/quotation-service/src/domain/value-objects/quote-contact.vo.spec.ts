import { ValidationError } from '@fardeen/shared';
import { QuoteContact } from './quote-contact.vo';

describe('QuoteContact', () => {
  it('constructs a valid contact, normalising email + phone + name', () => {
    const c = QuoteContact.create({
      name: '  Ada Lovelace  ',
      email: '  Ada@Example.COM ',
      phone: '(555) 123-4567',
    });
    expect(c.name).toBe('Ada Lovelace'); // trimmed
    expect(c.email).toBe('ada@example.com'); // trimmed + lowercased
    expect(c.phone).toBe('5551234567'); // stripped to digits/+
  });

  it('keeps a leading + on the phone', () => {
    expect(QuoteContact.create({ name: 'A', email: 'a@b.co', phone: '+1 555 999 8888' }).phone).toBe(
      '+15559998888',
    );
  });

  it('rejects an invalid email', () => {
    expect(() => QuoteContact.create({ name: 'A', email: 'not-an-email', phone: '5551234567' })).toThrow(
      ValidationError,
    );
  });

  it('rejects a phone with fewer than 7 digits', () => {
    expect(() => QuoteContact.create({ name: 'A', email: 'a@b.co', phone: '12345' })).toThrow(
      ValidationError,
    );
  });

  it('rejects a blank name', () => {
    expect(() => QuoteContact.create({ name: '   ', email: 'a@b.co', phone: '5551234567' })).toThrow(
      ValidationError,
    );
  });
});
