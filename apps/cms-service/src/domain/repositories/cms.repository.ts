import type { Page } from '../entities/page.entity';
import type { Testimonial } from '../entities/testimonial.entity';
import type { Slug } from '../value-objects/slug.vo';

export const PAGE_REPOSITORY = Symbol('PAGE_REPOSITORY');
export const TESTIMONIAL_REPOSITORY = Symbol('TESTIMONIAL_REPOSITORY');

export interface PageRepository {
  findBySlug(slug: Slug, includeUnpublished: boolean): Promise<Page | null>;
  /** All pages incl drafts, ordered by slug (admin). */
  listAll(): Promise<Page[]>;
  save(page: Page): Promise<void>;
}

export interface TestimonialRepository {
  list(featured?: boolean): Promise<Testimonial[]>;
}
