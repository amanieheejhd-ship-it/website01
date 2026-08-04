import { err, type GetProjectByIdPayload, ok, type ProjectDto, type Result } from '@fardeen/types';
import type { ProjectRepository } from '../../domain/repositories/project.repository';
import { toProjectDto } from '../mappers/project.mapper';
import { toErr } from '../result.util';

/** Admin single-read by id (includes drafts — the repo isn't status-filtered by id). */
export class GetProjectById {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(payload: GetProjectByIdPayload): Promise<Result<ProjectDto>> {
    try {
      const project = await this.repo.findById(payload.id);
      if (!project) {
        return err({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
      }
      return ok(toProjectDto(project));
    } catch (e) {
      return toErr(e);
    }
  }
}
