import { toErr } from './result.util';
import { DomainError, ValidationError } from '@fardeen/shared';

describe('toErr', () => {
  it('maps a DomainError to the err() Result envelope', () => {
    const domainError = new ValidationError('bad input', ['field: to']);
    const result = toErr(domainError);

    expect(result).toEqual({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'bad input', details: ['field: to'] },
    });
  });

  it('maps a base DomainError subclass instance', () => {
    const result = toErr(new DomainError('X_CODE', 'boom'));
    expect(result).toEqual({
      ok: false,
      error: { code: 'X_CODE', message: 'boom', details: undefined },
    });
  });

  it('rethrows anything that is not a DomainError', () => {
    const unexpected = new Error('kaboom');
    expect(() => toErr(unexpected)).toThrow('kaboom');
    expect(() => toErr('a string')).toThrow();
  });
});
