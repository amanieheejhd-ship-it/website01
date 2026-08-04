import { err, ok, type RemoveProjectPayload, type Result } from '@fardeen/types';
import type { ProjectRepository } from '../../domain/repositories/project.repository';

export class RemoveProject {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(payload: RemoveProjectPayload): Promise<Result<{ removed: true }>> {
    const removed = await this.repo.remove(payload.id);
    if (!removed) {
      return err({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    }
    return ok({ removed: true });
  }
}
