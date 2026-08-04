/**
 * Integration — Prisma CMS repositories against the REAL native Postgres (cms_db_test).
 * Proves the Page↔Section nested persistence + ordering, the published-only filter, the unique-slug
 * constraint, and Testimonial.list(featured?) filtering.
 */
import { randomUUID } from 'node:crypto';
import type { PageStatus, SectionType } from '@fardeen/types';
import { Page, type Section } from '../../domain/entities/page.entity';
import { Slug } from '../../domain/value-objects/slug.vo';
import { testDbUrl, truncate } from '../../../../../test/integration/support';
import { PrismaService } from './prisma.service';
import { PrismaPageRepository, PrismaTestimonialRepository } from './cms.repository.impl';

function makeSection(over: Partial<Section> & { order: number; type: SectionType }): Section {
  return {
    id: randomUUID(),
    payload: {},
    mediaRefs: [],
    ...over,
  };
}

function makePage(over: { slug: string; status?: PageStatus; sections?: Section[]; title?: string }): Page {
  return Page.create({
    id: randomUUID(),
    slug: Slug.create(over.slug),
    title: over.title ?? 'A Page',
    status: over.status ?? 'published',
    seo: { title: 'seo title', description: 'seo desc', ogImageMediaId: null },
    sections: over.sections ?? [],
  });
}

describe('Prisma CMS repositories (integration · real Postgres cms_db_test)', () => {
  let prisma: PrismaService;
  let pages: PrismaPageRepository;
  let testimonials: PrismaTestimonialRepository;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('cms_db_test'));
    await prisma.$connect();
    pages = new PrismaPageRepository(prisma);
    testimonials = new PrismaTestimonialRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), ['sections', 'pages', 'testimonials']);
  });

  it('round-trips a page with sections and returns them ordered by `order`', async () => {
    // Sections deliberately created out of order.
    const s2 = makeSection({
      order: 2,
      type: 'gallery',
      payload: { images: ['a', 'b'], caption: 'grid' },
      mediaRefs: ['med_g1', 'med_g2'],
    });
    const s0 = makeSection({
      order: 0,
      type: 'hero',
      payload: { heading: 'Welcome', cta: { label: 'Go', href: '/x' } },
      mediaRefs: ['med_hero'],
    });
    const s1 = makeSection({ order: 1, type: 'richText', payload: { html: '<p>hi</p>' }, mediaRefs: [] });

    const page = makePage({ slug: 'home', title: 'Home', sections: [s2, s0, s1] });
    await pages.save(page);

    const found = await pages.findBySlug(Slug.create('home'), false);
    expect(found).not.toBeNull();
    expect(found!.slug.value).toBe('home');
    expect(found!.title).toBe('Home');
    expect(found!.seo).toEqual({ title: 'seo title', description: 'seo desc', ogImageMediaId: null });

    const ordered = found!.sections;
    expect(ordered.map((s) => s.order)).toEqual([0, 1, 2]);
    expect(ordered.map((s) => s.type)).toEqual<SectionType[]>(['hero', 'richText', 'gallery']);

    // Field-level fidelity: payload JSON + mediaRefs persist verbatim.
    expect(ordered[0].payload).toEqual({ heading: 'Welcome', cta: { label: 'Go', href: '/x' } });
    expect(ordered[0].mediaRefs).toEqual(['med_hero']);
    expect(ordered[2].payload).toEqual({ images: ['a', 'b'], caption: 'grid' });
    expect(ordered[2].mediaRefs).toEqual(['med_g1', 'med_g2']);
  });

  it('replaces sections on re-save (no stale/duplicate rows) and keeps order consistent', async () => {
    const page = makePage({
      slug: 'about',
      sections: [
        makeSection({ order: 0, type: 'hero' }),
        makeSection({ order: 1, type: 'richText' }),
      ],
    });
    await pages.save(page);

    // Re-save the SAME page id with 3 (freshly-id'd) sections.
    const resaved = Page.rehydrate({
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      seo: page.seo,
      sections: [
        makeSection({ order: 0, type: 'hero' }),
        makeSection({ order: 1, type: 'scene' }),
        makeSection({ order: 2, type: 'cta' }),
      ],
    });
    await pages.save(resaved);

    const found = await pages.findBySlug(Slug.create('about'), false);
    expect(found!.sections).toHaveLength(3);
    expect(found!.sections.map((s) => s.order)).toEqual([0, 1, 2]);
    expect(found!.sections.map((s) => s.type)).toEqual<SectionType[]>(['hero', 'scene', 'cta']);

    // Ground truth: exactly 3 section rows exist for this page (no leftovers).
    const rowCount = await prisma.section.count({ where: { pageId: page.id } });
    expect(rowCount).toBe(3);
  });

  it('findBySlug hides a draft unless includeUnpublished, and always shows a published page', async () => {
    await pages.save(makePage({ slug: 'draft-page', status: 'draft' }));
    await pages.save(makePage({ slug: 'live-page', status: 'published' }));

    expect(await pages.findBySlug(Slug.create('draft-page'), false)).toBeNull();
    expect(await pages.findBySlug(Slug.create('draft-page'), true)).not.toBeNull();

    expect(await pages.findBySlug(Slug.create('live-page'), false)).not.toBeNull();
    expect(await pages.findBySlug(Slug.create('live-page'), true)).not.toBeNull();
  });

  it('enforces the unique slug constraint at the database', async () => {
    await pages.save(makePage({ slug: 'unique-slug' }));
    // A different page id but the same slug must violate the DB unique index (P2002).
    await expect(pages.save(makePage({ slug: 'unique-slug' }))).rejects.toThrow();
  });

  it('Testimonial.list filters by the featured flag', async () => {
    await prisma.testimonial.createMany({
      data: [
        { id: randomUUID(), author: 'Alice', quote: 'Great', featured: true, rating: 5 },
        { id: randomUUID(), author: 'Bob', quote: 'Good', featured: true, rating: 4 },
        { id: randomUUID(), author: 'Carol', quote: 'Ok', featured: false, rating: 3 },
      ],
    });

    const all = await testimonials.list();
    expect(all).toHaveLength(3);

    const onlyFeatured = await testimonials.list(true);
    expect(onlyFeatured).toHaveLength(2);
    expect(onlyFeatured.every((t) => t.featured)).toBe(true);
    expect(onlyFeatured.map((t) => t.author).sort()).toEqual(['Alice', 'Bob']);

    const notFeatured = await testimonials.list(false);
    expect(notFeatured).toHaveLength(1);
    expect(notFeatured[0].author).toBe('Carol');
  });
});
