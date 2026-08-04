import { ok, type ProjectListPayload, type ProjectListResult, type Result } from '@fardeen/types';
import type { ProjectRepository } from '../../domain/repositories/project.repository';
import { toProjectListItemDto } from '../mappers/project.mapper';

export class ListProjects {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(payload: ProjectListPayload): Promise<Result<ProjectListResult>> {
    const { items, total } = await this.repo.list({
      categorySlug: payload.category,
      featured: payload.featured,
      page: payload.page,
      limit: payload.limit,
      includeUnpublished: payload.includeUnpublished ?? false,
    });
    return ok({
      items: items.map(toProjectListItemDto),
      page: payload.page,
      limit: payload.limit,
      total,
    });
  }
}
