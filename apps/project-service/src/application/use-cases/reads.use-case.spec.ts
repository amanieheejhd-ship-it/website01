import { Category } from '../../domain/entities/category.entity';
import { Project } from '../../domain/entities/project.entity';
import type {
  CategoryRepository,
  ProjectRepository,
} from '../../domain/repositories/project.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { GetProjectById } from './get-project-by-id.use-case';
import { GetProjectBySlug } from './get-project-by-slug.use-case';
import { ListCategories } from './list-categories.use-case';
import { RemoveProject } from './remove-project.use-case';

function makeProject(): Project {
  return Project.rehydrate({
    id: 'proj-1',
    slug: Slug.create('atrium-house'),
    title: 'Atrium House',
    summary: 's',
    body: 'b',
    categoryId: 'cat-1',
    location: 'Dubai',
    year: 2024,
    coverMediaId: 'm',
    galleryMediaIds: ['g1'],
    status: 'published',
    featured: false,
    metrics: { area: null, durationMonths: null },
  });
}

function makeProjectRepo(): jest.Mocked<ProjectRepository> {
  return {
    list: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    existsBySlug: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
}

describe('GetProjectBySlug', () => {
  it('returns the mapped DTO when found (public read → includeUnpublished false)', async () => {
    const repo = makeProjectRepo();
    repo.findBySlug.mockResolvedValue(makeProject());
    const res = await new GetProjectBySlug(repo).execute({ slug: 'atrium-house' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.slug).toBe('atrium-house');
    expect(res.data.body).toBe('b');
    const passedIncludeUnpublished = repo.findBySlug.mock.calls[0][1];
    expect(passedIncludeUnpublished).toBe(false);
  });

  it('honors includeUnpublished when supplied', async () => {
    const repo = makeProjectRepo();
    repo.findBySlug.mockResolvedValue(makeProject());
    await new GetProjectBySlug(repo).execute({ slug: 'atrium-house', includeUnpublished: true });
    expect(repo.findBySlug.mock.calls[0][1]).toBe(true);
  });

  it('returns PROJECT_NOT_FOUND when absent', async () => {
    const repo = makeProjectRepo();
    repo.findBySlug.mockResolvedValue(null);
    const res = await new GetProjectBySlug(repo).execute({ slug: 'atrium-house' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('maps a thrown domain error (invalid slug) to a Result error', async () => {
    const repo = makeProjectRepo();
    const res = await new GetProjectBySlug(repo).execute({ slug: '!!!' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GetProjectById', () => {
  it('returns the mapped DTO when found', async () => {
    const repo = makeProjectRepo();
    repo.findById.mockResolvedValue(makeProject());
    const res = await new GetProjectById(repo).execute({ id: 'proj-1' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.id).toBe('proj-1');
  });

  it('returns PROJECT_NOT_FOUND when absent', async () => {
    const repo = makeProjectRepo();
    repo.findById.mockResolvedValue(null);
    const res = await new GetProjectById(repo).execute({ id: 'missing' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('PROJECT_NOT_FOUND');
  });
});

describe('RemoveProject', () => {
  it('returns { removed: true } when the repo removes a row', async () => {
    const repo = makeProjectRepo();
    repo.remove.mockResolvedValue(true);
    const res = await new RemoveProject(repo).execute({ id: 'proj-1' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual({ removed: true });
  });

  it('returns PROJECT_NOT_FOUND when nothing was removed', async () => {
    const repo = makeProjectRepo();
    repo.remove.mockResolvedValue(false);
    const res = await new RemoveProject(repo).execute({ id: 'missing' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('PROJECT_NOT_FOUND');
  });
});

describe('ListCategories', () => {
  it('returns ordered categories mapped to DTOs', async () => {
    const categories: jest.Mocked<CategoryRepository> = {
      listOrdered: jest.fn().mockResolvedValue([
        Category.create({ id: 'c1', slug: Slug.create('residential'), name: 'Residential', order: 1 }),
        Category.create({ id: 'c2', slug: Slug.create('commercial'), name: 'Commercial', order: 2 }),
      ]),
      exists: jest.fn(),
    };
    const res = await new ListCategories(categories).execute();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual([
      { id: 'c1', slug: 'residential', name: 'Residential', order: 1 },
      { id: 'c2', slug: 'commercial', name: 'Commercial', order: 2 },
    ]);
  });
});
