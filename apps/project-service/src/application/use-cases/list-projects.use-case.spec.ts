import type { ProjectListPayload } from '@fardeen/types';
import { Project } from '../../domain/entities/project.entity';
import type { ProjectRepository } from '../../domain/repositories/project.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ListProjects } from './list-projects.use-case';

function makeProject(slug: string): Project {
  return Project.rehydrate({
    id: `id-${slug}`,
    slug: Slug.create(slug),
    title: slug,
    summary: 's',
    body: 'b',
    categoryId: 'cat-1',
    location: 'Dubai',
    year: 2024,
    coverMediaId: 'm',
    galleryMediaIds: [],
    status: 'published',
    featured: false,
    metrics: { area: null, durationMonths: null },
  });
}

function makeRepo(items: Project[], total: number): jest.Mocked<ProjectRepository> {
  return {
    list: jest.fn().mockResolvedValue({ items, total }),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    existsBySlug: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
}

const basePayload: ProjectListPayload = {
  category: undefined,
  featured: undefined,
  page: 1,
  limit: 12,
};

describe('ListProjects', () => {
  it('defaults to published-only when includeUnpublished is not provided', async () => {
    const repo = makeRepo([], 0);
    await new ListProjects(repo).execute(basePayload);
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ includeUnpublished: false }),
    );
  });

  it('forwards category and featured filters plus pagination', async () => {
    const repo = makeRepo([makeProject('a')], 1);
    await new ListProjects(repo).execute({
      category: 'residential',
      featured: true,
      page: 2,
      limit: 5,
      includeUnpublished: true,
    });
    expect(repo.list).toHaveBeenCalledWith({
      categorySlug: 'residential',
      featured: true,
      page: 2,
      limit: 5,
      includeUnpublished: true,
    });
  });

  it('returns mapped items with page/limit/total echoed', async () => {
    const repo = makeRepo([makeProject('a'), makeProject('b')], 27);
    const res = await new ListProjects(repo).execute({ ...basePayload, page: 3, limit: 10 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(27);
    expect(res.data.page).toBe(3);
    expect(res.data.limit).toBe(10);
    expect(res.data.items.map((i) => i.slug)).toEqual(['a', 'b']);
    // list-item DTO shape (no body / galleryMediaIds)
    expect(res.data.items[0]).not.toHaveProperty('body');
  });
});
