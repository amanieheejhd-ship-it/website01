import { Page, type PageProps } from './page.entity';
import { Slug } from '../value-objects/slug.vo';

const baseProps = (overrides: Partial<PageProps> = {}): PageProps => ({
  id: 'page-1',
  slug: Slug.create('home'),
  title: 'Home',
  status: 'draft',
  seo: { title: 'Home', description: 'desc', ogImageMediaId: null },
  sections: [],
  ...overrides,
});

describe('Page entity', () => {
  describe('publish()', () => {
    it('flips a draft to published (status + isPublished flag)', () => {
      const page = Page.create(baseProps({ status: 'draft' }));
      expect(page.status).toBe('draft');
      expect(page.isPublished()).toBe(false);

      page.publish();

      expect(page.status).toBe('published');
      expect(page.isPublished()).toBe(true);
    });

    it('is idempotent on an already-published page', () => {
      const page = Page.create(baseProps({ status: 'published' }));
      page.publish();
      expect(page.status).toBe('published');
      expect(page.isPublished()).toBe(true);
    });
  });

  describe('sections getter (ordered)', () => {
    it('returns sections sorted by order regardless of input order', () => {
      const page = Page.create(
        baseProps({
          sections: [
            { id: 'c', type: 'cta', order: 2, payload: {}, mediaRefs: [] },
            { id: 'a', type: 'hero', order: 0, payload: {}, mediaRefs: [] },
            { id: 'b', type: 'richText', order: 1, payload: {}, mediaRefs: [] },
          ],
        }),
      );
      expect(page.sections.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    });

    it('does not mutate the underlying array (returns a sorted copy)', () => {
      const sections = [
        { id: 'c', type: 'cta' as const, order: 2, payload: {}, mediaRefs: [] },
        { id: 'a', type: 'hero' as const, order: 0, payload: {}, mediaRefs: [] },
      ];
      const page = Page.create(baseProps({ sections }));
      const ordered = page.sections;
      expect(ordered.map((s) => s.id)).toEqual(['a', 'c']);
      // original untouched
      expect(sections.map((s) => s.id)).toEqual(['c', 'a']);
    });
  });

  describe('accessors + rehydrate', () => {
    it('exposes props via getters and rehydrates from persistence', () => {
      const slug = Slug.create('about');
      const page = Page.rehydrate(
        baseProps({ id: 'p9', slug, title: 'About', status: 'published' }),
      );
      expect(page.id).toBe('p9');
      expect(page.slug).toBe(slug);
      expect(page.title).toBe('About');
      expect(page.seo.description).toBe('desc');
    });
  });
});
