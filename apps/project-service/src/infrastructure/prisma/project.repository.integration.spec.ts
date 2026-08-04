/**
 * Integration — PrismaProjectRepository against the REAL native Postgres (project_db_test).
 * Proves the Prisma schema ↔ domain mapping, the unique-slug constraint, and list() filters/pagination.
 */
import { randomUUID } from 'node:crypto';
import type { ProjectStatus } from '@fardeen/types';
import { Project, type ProjectProps } from '../../domain/entities/project.entity';
import { Slug } from '../../domain/value-objects/slug.vo';
import { testDbUrl, truncate } from '../../../../../test/integration/support';
import { PrismaService } from './prisma.service';
import { PrismaProjectRepository } from './project.repository.impl';

const CATEGORY_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY2_ID = '22222222-2222-2222-2222-222222222222';

function makeProject(over: Partial<ProjectProps> & { slug: string }): Project {
  const props: ProjectProps = {
    id: randomUUID(),
    title: 'A Project',
    summary: 'summary',
    body: 'body',
    categoryId: CATEGORY_ID,
    location: 'Mumbai',
    year: 2024,
    coverMediaId: null,
    galleryMediaIds: [],
    status: 'published' as ProjectStatus,
    featured: false,
    metrics: { area: null, durationMonths: null },
    ...over,
    slug: Slug.create(over.slug),
  };
  return Project.create(props);
}

describe('PrismaProjectRepository (integration · real Postgres project_db_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaProjectRepository;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('project_db_test'));
    await prisma.$connect();
    repo = new PrismaProjectRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), ['projects', 'categories']);
    await prisma.category.createMany({
      data: [
        { id: CATEGORY_ID, slug: 'residential', name: 'Residential', order: 1 },
        { id: CATEGORY2_ID, slug: 'commercial', name: 'Commercial', order: 2 },
      ],
    });
  });

  it('round-trips a project and reconstructs the domain aggregate faithfully', async () => {
    const p = makeProject({
      slug: 'skyline-villa',
      title: 'Skyline Villa',
      coverMediaId: 'med_cover',
      galleryMediaIds: ['med_a', 'med_b'],
      featured: true,
      metrics: { area: '4,200 sq ft', durationMonths: 14 },
    });
    await repo.save(p);

    const found = await repo.findById(p.id);
    expect(found).not.toBeNull();
    expect(found!.slug.value).toBe('skyline-villa');
    expect(found!.title).toBe('Skyline Villa');
    expect(found!.featured).toBe(true);
    expect(found!.coverMediaId).toBe('med_cover');
    expect(found!.galleryMediaIds).toEqual(['med_a', 'med_b']);
    expect(found!.metrics).toEqual({ area: '4,200 sq ft', durationMonths: 14 });
    expect(found!.isPublished()).toBe(true);

    // findBySlug honors the published-only flag
    expect(await repo.findBySlug(Slug.create('skyline-villa'), false)).not.toBeNull();
  });

  it('enforces the unique slug constraint at the database', async () => {
    await repo.save(makeProject({ slug: 'duplicate' }));
    // a different id but the same slug must violate the DB unique index
    await expect(repo.save(makeProject({ slug: 'duplicate' }))).rejects.toThrow();
  });

  it('list() returns published-only by default and all when includeUnpublished', async () => {
    await repo.save(makeProject({ slug: 'live-one', status: 'published' as ProjectStatus }));
    await repo.save(makeProject({ slug: 'draft-one', status: 'draft' as ProjectStatus }));

    const published = await repo.list({ page: 1, limit: 10, includeUnpublished: false });
    expect(published.total).toBe(1);
    expect(published.items[0].slug.value).toBe('live-one');

    const all = await repo.list({ page: 1, limit: 10, includeUnpublished: true });
    expect(all.total).toBe(2);
  });

  it('filters by category slug and by the featured flag', async () => {
    await repo.save(makeProject({ slug: 'res-featured', featured: true, coverMediaId: 'c', categoryId: CATEGORY_ID }));
    await repo.save(makeProject({ slug: 'res-plain', categoryId: CATEGORY_ID }));
    await repo.save(makeProject({ slug: 'com-plain', categoryId: CATEGORY2_ID }));

    const commercial = await repo.list({ page: 1, limit: 10, includeUnpublished: false, categorySlug: 'commercial' });
    expect(commercial.total).toBe(1);
    expect(commercial.items[0].slug.value).toBe('com-plain');

    const featured = await repo.list({ page: 1, limit: 10, includeUnpublished: false, featured: true });
    expect(featured.total).toBe(1);
    expect(featured.items[0].slug.value).toBe('res-featured');
  });

  it('paginates with a stable total', async () => {
    for (const n of [2021, 2022, 2023]) {
      await repo.save(makeProject({ slug: `proj-${n}`, year: n }));
    }
    const page1 = await repo.list({ page: 1, limit: 2, includeUnpublished: false });
    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);

    const page2 = await repo.list({ page: 2, limit: 2, includeUnpublished: false });
    expect(page2.total).toBe(3);
    expect(page2.items).toHaveLength(1);
    // ordered by year desc → newest first on page 1
    expect(page1.items[0].year).toBe(2023);
  });
});
