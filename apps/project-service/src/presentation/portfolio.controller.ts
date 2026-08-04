import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  PROJECT_PATTERNS,
  type CreateProjectPayload,
  type GetProjectByIdPayload,
  type GetProjectBySlugPayload,
  type ProjectListPayload,
  type RemoveProjectPayload,
  type UpdateProjectPayload,
} from '@fardeen/types';
import { CreateProject } from '../application/use-cases/create-project.use-case';
import { GetProjectById } from '../application/use-cases/get-project-by-id.use-case';
import { GetProjectBySlug } from '../application/use-cases/get-project-by-slug.use-case';
import { ListCategories } from '../application/use-cases/list-categories.use-case';
import { ListProjects } from '../application/use-cases/list-projects.use-case';
import { RemoveProject } from '../application/use-cases/remove-project.use-case';
import { UpdateProject } from '../application/use-cases/update-project.use-case';

@Controller()
export class PortfolioController {
  constructor(
    private readonly listProjects: ListProjects,
    private readonly getProjectBySlug: GetProjectBySlug,
    private readonly getProjectById: GetProjectById,
    private readonly listCategories: ListCategories,
    private readonly createProject: CreateProject,
    private readonly updateProject: UpdateProject,
    private readonly removeProject: RemoveProject,
  ) {}

  @MessagePattern(PROJECT_PATTERNS.list)
  list(@Payload() payload: ProjectListPayload) {
    return this.listProjects.execute(payload);
  }

  @MessagePattern(PROJECT_PATTERNS.getBySlug)
  getBySlug(@Payload() payload: GetProjectBySlugPayload) {
    return this.getProjectBySlug.execute(payload);
  }

  @MessagePattern(PROJECT_PATTERNS.getById)
  getById(@Payload() payload: GetProjectByIdPayload) {
    return this.getProjectById.execute(payload);
  }

  @MessagePattern(PROJECT_PATTERNS.listCategories)
  categories() {
    return this.listCategories.execute();
  }

  @MessagePattern(PROJECT_PATTERNS.create)
  create(@Payload() payload: CreateProjectPayload) {
    return this.createProject.execute(payload);
  }

  @MessagePattern(PROJECT_PATTERNS.update)
  update(@Payload() payload: UpdateProjectPayload) {
    return this.updateProject.execute(payload);
  }

  @MessagePattern(PROJECT_PATTERNS.remove)
  remove(@Payload() payload: RemoveProjectPayload) {
    return this.removeProject.execute(payload);
  }
}
