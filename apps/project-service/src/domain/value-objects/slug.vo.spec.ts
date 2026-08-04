import { ValidationError } from '@fardeen/shared';
import { Slug } from './slug.vo';

describe('Slug (value object)', () => {
  it('normalizes a valid raw string into a slug', () => {
    const slug = Slug.create('Hello World!');
    expect(slug.value).toBe('hello-world');
    expect(slug.toString()).toBe('hello-world');
  });

  it('collapses diacritics and non-alphanumerics', () => {
    expect(Slug.create('  Café  Déjà Vu  ').value).toBe('cafe-deja-vu');
  });

  it.each(['', '   ', '!!!', '---', '   @#$   '])(
    'rejects an unslugifiable input %p with a ValidationError',
    (raw) => {
      expect(() => Slug.create(raw)).toThrow(ValidationError);
    },
  );
});
