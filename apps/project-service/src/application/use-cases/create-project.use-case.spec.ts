import { EVENTS, type CreateProjectPayload } from '@fardeen/types';
import type {
  CategoryRepository,
  ProjectRepository,
} from '../../domain/repositories/project.repository';
import type { EventPublisher } from '../ports/event-publisher.port';
import { CreateProject } from './create-project.use-case';

function makeRepo(): jest.Mocked<ProjectRepository> {
  return {
    list: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    existsBySlug: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  };
}
function makeCategories(): jest.Mocked<CategoryRepository> {
  return {
    listOrdered: jest.fn(),
    exists: jest.fn().mockResolvedValue(true),
  };
}
function makeEvents(): jest.Mocked<EventPublisher> {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

function payload(overrides: Partial<CreateProjectPayload> = {}): CreateProjectPayload {
  return {
    slug: 'atrium-house',
    title: 'Atrium House',
    summary: 's',
    body: 'b',
    categoryId: 'cat-1',
    location: 'Dubai',
    year: 2024,
    coverMediaId: 'media-1',
    galleryMediaIds: [],
    status: 'draft',
    featured: false,
    metrics: {},
    correlationId: 'corr-1',
    ...overrides,
  };
}

describe('CreateProject', () => {
  it('returns PROJECT_SLUG_TAKEN and does not save when slug exists', async () => {
    const repo = makeRepo();
    repo.existsBySlug.mockResolvedValue(true);
    const events = makeEvents();
    const res = await new CreateProject(repo, makeCategories(), events).execute(payload());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('PROJECT_SLUG_TAKEN');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('returns CATEGORY_NOT_FOUND when the category is missing', async () => {
    const repo = makeRepo();
    const categories = makeCategories();
    categories.exists.mockResolvedValue(false);
    const res = await new CreateProject(repo, categories, makeEvents()).execute(payload());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('CATEGORY_NOT_FOUND');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('saves and emits project.published ONLY when status is published', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const res = await new CreateProject(repo, makeCategories(), events).execute(
      payload({ status: 'published', coverMediaId: 'media-1' }),
    );
    expect(res.ok).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVENTS.projectPublished,
        correlationId: 'corr-1',
        data: expect.objectContaining({ slug: 'atrium-house', title: 'Atrium House' }),
      }),
    );
  });

  it('saves but does NOT emit an event when status is draft', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const res = await new CreateProject(repo, makeCategories(), events).execute(
      payload({ status: 'draft' }),
    );
    expect(res.ok).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('defaults a missing coverMediaId to null', async () => {
    const repo = makeRepo();
    const res = await new CreateProject(repo, makeCategories(), makeEvents()).execute(
      payload({ coverMediaId: undefined, status: 'draft' }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.coverMediaId).toBeNull();
  });

  it('maps a domain ValidationError (featured+draft) to a Result error envelope', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const res = await new CreateProject(repo, makeCategories(), events).execute(
      payload({ featured: true, status: 'draft' }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
