import { ValidationError } from '@fardeen/shared';
import { Slug } from './slug.vo';

describe('Slug value object', () => {
  it('creates a normalized url-safe slug from an arbitrary title', () => {
    const slug = Slug.create('Hello World!');
    expect(slug.value).toBe('hello-world');
    expect(slug.toString()).toBe('hello-world');
  });

  it('collapses diacritics, symbols and repeated separators', () => {
    expect(Slug.create('  Café  Déjà-Vu  ').value).toBe('cafe-deja-vu');
  });

  it('rejects a slug that normalizes to empty with a ValidationError', () => {
    expect(() => Slug.create('!!!')).toThrow(ValidationError);
    expect(() => Slug.create('   ')).toThrow(/Invalid slug/);
  });
});
