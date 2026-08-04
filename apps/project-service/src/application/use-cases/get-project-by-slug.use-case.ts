import { err, ok, type GetProjectBySlugPayload, type ProjectDto, type Result } from '@fardeen/types';
import type { ProjectRepository } from '../../domain/repositories/project.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { toProjectDto } from '../mappers/project.mapper';
import { toErr } from '../result.util';

export class GetProjectBySlug {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(payload: GetProjectBySlugPayload): Promise<Result<ProjectDto>> {
    try {
      const project = await this.repo.findBySlug(
        Slug.create(payload.slug),
        payload.includeUnpublished ?? false,
      );
      if (!project) {
        return err({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
      }
      return ok(toProjectDto(project));
    } catch (e) {
      return toErr(e);
    }
  }
}
