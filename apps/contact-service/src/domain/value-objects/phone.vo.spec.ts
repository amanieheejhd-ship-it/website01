import { ValidationError } from '@fardeen/shared';
import { Phone } from './phone.vo';

describe('Phone value object', () => {
  it('keeps a leading + and strips formatting characters', () => {
    const phone = Phone.create('+1 (555) 123-4567');
    expect(phone.value).toBe('+15551234567');
    expect(phone.toString()).toBe('+15551234567');
  });

  it('normalizes plain national numbers', () => {
    expect(Phone.create('020 7946 0958').value).toBe('02079460958');
  });

  it.each(['123', '12-34', '+++', 'abcdef', ''])('rejects invalid number %p (< 7 digits)', (raw) => {
    expect(() => Phone.create(raw)).toThrow(ValidationError);
  });
});
