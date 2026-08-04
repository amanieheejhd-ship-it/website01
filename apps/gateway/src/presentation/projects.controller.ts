import { BadRequestException, Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  type CategoryDto,
  type ProjectDto,
  type ProjectListResult,
  PROJECT_PATTERNS,
  projectListQuerySchema,
  SERVICE_CLIENTS,
} from '@fardeen/types';
import { callService } from '../common/client.util';
import type { FardeenRequest } from '../common/http';
import { MediaResolver } from '../common/media-resolver';

/** Public portfolio. Published-only; list paginated; cover/gallery media resolved at the gateway. */
@Controller('projects')
export class ProjectsController {
  constructor(
    @Inject(SERVICE_CLIENTS.project) private readonly client: ClientProxy,
    private readonly media: MediaResolver,
  ) {}

  @Get()
  async list(@Query() query: unknown, @Req() req: FardeenRequest): Promise<unknown> {
    const parsed = projectListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parsed.error.issues,
      });
    }
    const result = await callService<ProjectListResult>(this.client, PROJECT_PATTERNS.list, {
      ...parsed.data,
      includeUnpublished: false,
    });
    const media = await this.media.resolveMany(result.items.map((p) => p.coverMediaId));
    return {
      data: result.items,
      included: { media },
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        requestId: req.requestId ?? 'unknown',
      },
    };
  }

  // declared before ':slug' so /projects/categories isn't captured as a slug
  @Get('categories')
  categories(): Promise<CategoryDto[]> {
    return callService<CategoryDto[]>(this.client, PROJECT_PATTERNS.listCategories, {});
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string, @Req() req: FardeenRequest): Promise<unknown> {
    const project = await callService<ProjectDto>(this.client, PROJECT_PATTERNS.getBySlug, {
      slug,
      includeUnpublished: false,
    });
    const media = await this.media.resolveMany([project.coverMediaId, ...project.galleryMediaIds]);
    return { data: project, included: { media }, meta: { requestId: req.requestId ?? 'unknown' } };
  }
}
