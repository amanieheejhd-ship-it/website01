import { ValidationError } from '@fardeen/shared';
import { slugify } from '@fardeen/utils';

export class Slug {
  private constructor(public readonly value: string) {}

  static create(raw: string): Slug {
    const s = slugify(raw);
    if (!s) throw new ValidationError(`Invalid slug: "${raw}"`);
    return new Slug(s);
  }

  toString(): string {
    return this.value;
  }
}
