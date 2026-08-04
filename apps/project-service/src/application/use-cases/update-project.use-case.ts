import { EVENTS, err, ok, type ProjectDto, type Result, type UpdateProjectPayload } from '@fardeen/types';
import { Project } from '../../domain/entities/project.entity';
import type { ProjectRepository } from '../../domain/repositories/project.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { toProjectDto } from '../mappers/project.mapper';
import { toErr } from '../result.util';

export class UpdateProject {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: UpdateProjectPayload): Promise<Result<ProjectDto>> {
    try {
      const existing = await this.repo.findById(payload.id);
      if (!existing) {
        return err({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
      }
      const wasPublished = existing.isPublished();
      const updated = Project.create({
        id: existing.id,
        slug: payload.slug ? Slug.create(payload.slug) : existing.slug,
        title: payload.title ?? existing.title,
        summary: payload.summary ?? existing.summary,
        body: payload.body ?? existing.body,
        categoryId: payload.categoryId ?? existing.categoryId,
        location: payload.location ?? existing.location,
        year: payload.year ?? existing.year,
        coverMediaId:
          payload.coverMediaId !== undefined ? payload.coverMediaId ?? null : existing.coverMediaId,
        galleryMediaIds: payload.galleryMediaIds ?? existing.galleryMediaIds,
        status: payload.status ?? existing.status,
        featured: payload.featured ?? existing.featured,
        metrics: {
          area:
            payload.metrics?.area !== undefined ? payload.metrics.area ?? null : existing.metrics.area,
          durationMonths:
            payload.metrics?.durationMonths !== undefined
              ? payload.metrics.durationMonths ?? null
              : existing.metrics.durationMonths,
        },
      });
      await this.repo.save(updated);

      if (!wasPublished && updated.isPublished()) {
        await this.events.publish({
          name: EVENTS.projectPublished,
          correlationId: payload.correlationId,
          data: { projectId: updated.id, slug: updated.slug.value, title: updated.title },
        });
      }
      return ok(toProjectDto(updated));
    } catch (e) {
      return toErr(e);
    }
  }
}
