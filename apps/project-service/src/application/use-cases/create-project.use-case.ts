import { randomUUID } from 'node:crypto';
import { type CreateProjectPayload, EVENTS, err, ok, type ProjectDto, type Result } from '@fardeen/types';
import { Project } from '../../domain/entities/project.entity';
import type {
  CategoryRepository,
  ProjectRepository,
} from '../../domain/repositories/project.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { toProjectDto } from '../mappers/project.mapper';
import { toErr } from '../result.util';

export class CreateProject {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly categories: CategoryRepository,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: CreateProjectPayload): Promise<Result<ProjectDto>> {
    try {
      const slug = Slug.create(payload.slug);
      if (await this.repo.existsBySlug(slug)) {
        return err({ code: 'PROJECT_SLUG_TAKEN', message: 'A project with this slug already exists' });
      }
      if (!(await this.categories.exists(payload.categoryId))) {
        return err({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
      }
      const project = Project.create({
        id: randomUUID(),
        slug,
        title: payload.title,
        summary: payload.summary,
        body: payload.body,
        categoryId: payload.categoryId,
        location: payload.location,
        year: payload.year,
        coverMediaId: payload.coverMediaId ?? null,
        galleryMediaIds: payload.galleryMediaIds,
        status: payload.status,
        featured: payload.featured,
        metrics: {
          area: payload.metrics.area ?? null,
          durationMonths: payload.metrics.durationMonths ?? null,
        },
      });
      await this.repo.save(project);

      if (project.isPublished()) {
        await this.events.publish({
          name: EVENTS.projectPublished,
          correlationId: payload.correlationId,
          data: { projectId: project.id, slug: project.slug.value, title: project.title },
        });
      }
      return ok(toProjectDto(project));
    } catch (e) {
      return toErr(e);
    }
  }
}
