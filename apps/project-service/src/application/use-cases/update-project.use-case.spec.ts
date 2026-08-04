import { EVENTS, type ProjectStatus, type UpdateProjectPayload } from '@fardeen/types';
import { Project } from '../../domain/entities/project.entity';
import type { ProjectRepository } from '../../domain/repositories/project.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { UpdateProject } from './update-project.use-case';

function existingProject(status: ProjectStatus): Project {
  return Project.rehydrate({
    id: 'proj-1',
    slug: Slug.create('atrium-house'),
    title: 'Atrium House',
    summary: 's',
    body: 'b',
    categoryId: 'cat-1',
    location: 'Dubai',
    year: 2024,
    coverMediaId: 'media-1',
    galleryMediaIds: [],
    status,
    featured: false,
    metrics: { area: null, durationMonths: null },
  });
}

function makeRepo(existing: Project | null): jest.Mocked<ProjectRepository> {
  return {
    list: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn().mockResolvedValue(existing),
    existsBySlug: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  };
}
function makeEvents(): jest.Mocked<EventPublisher> {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

const base: UpdateProjectPayload = { id: 'proj-1', correlationId: 'corr-1' };

describe('UpdateProject', () => {
  it('returns PROJECT_NOT_FOUND when the project is missing', async () => {
    const repo = makeRepo(null);
    const events = makeEvents();
    const res = await new UpdateProject(repo, events).execute(base);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('PROJECT_NOT_FOUND');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('emits project.published on a draft → published transition', async () => {
    const repo = makeRepo(existingProject('draft'));
    const events = makeEvents();
    const res = await new UpdateProject(repo, events).execute({ ...base, status: 'published' });
    expect(res.ok).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVENTS.projectPublished,
        correlationId: 'corr-1',
        data: expect.objectContaining({ projectId: 'proj-1', slug: 'atrium-house' }),
      }),
    );
  });

  it('does NOT emit when the project stays a draft', async () => {
    const repo = makeRepo(existingProject('draft'));
    const events = makeEvents();
    const res = await new UpdateProject(repo, events).execute({ ...base, title: 'Renamed' });
    expect(res.ok).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('does NOT re-emit when the project was already published', async () => {
    const repo = makeRepo(existingProject('published'));
    const events = makeEvents();
    const res = await new UpdateProject(repo, events).execute({ ...base, status: 'published' });
    expect(res.ok).toBe(true);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('applies all optionally-provided fields (slug/cover/metrics) onto the update', async () => {
    const repo = makeRepo(existingProject('draft'));
    const events = makeEvents();
    const res = await new UpdateProject(repo, events).execute({
      ...base,
      slug: 'new-slug',
      title: 'New Title',
      summary: 'new summary',
      body: 'new body',
      categoryId: 'cat-2',
      location: 'Abu Dhabi',
      year: 2025,
      coverMediaId: 'cover-2',
      galleryMediaIds: ['g1'],
      metrics: { area: '900m2', durationMonths: 24 },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.slug).toBe('new-slug');
    expect(res.data.title).toBe('New Title');
    expect(res.data.coverMediaId).toBe('cover-2');
    expect(res.data.metrics).toEqual({ area: '900m2', durationMonths: 24 });
  });

  it('clears cover and metrics when explicit nulls are provided', async () => {
    const repo = makeRepo(existingProject('draft'));
    const events = makeEvents();
    const res = await new UpdateProject(repo, events).execute({
      ...base,
      coverMediaId: null,
      metrics: { area: null, durationMonths: null },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.coverMediaId).toBeNull();
    expect(res.data.metrics).toEqual({ area: null, durationMonths: null });
  });

  it('maps a domain ValidationError to a Result error envelope', async () => {
    const repo = makeRepo(existingProject('draft'));
    const events = makeEvents();
    // featured true while remaining draft violates the featured invariant
    const res = await new UpdateProject(repo, events).execute({ ...base, featured: true });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.save).not.toHaveBeenCalled();
  });
});
