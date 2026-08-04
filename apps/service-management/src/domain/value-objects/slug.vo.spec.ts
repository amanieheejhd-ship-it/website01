import { ValidationError } from '@fardeen/shared';
import { Slug } from './slug.vo';

describe('Slug value object', () => {
  it('normalizes a human string into a URL-safe slug', () => {
    const s = Slug.create('Wedding Photography!');
    expect(s.value).toBe('wedding-photography');
    expect(s.toString()).toBe('wedding-photography');
  });

  it('passes an already-normalized slug through unchanged', () => {
    expect(Slug.create('event-planning').value).toBe('event-planning');
  });

  it('rejects input that normalizes to an empty slug', () => {
    expect(() => Slug.create('   ')).toThrow(ValidationError);
    expect(() => Slug.create('!!!')).toThrow(ValidationError);
  });
});
