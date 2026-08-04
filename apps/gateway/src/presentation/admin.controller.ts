import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ADMIN_PATTERNS,
  createProjectSchema,
  SERVICE_CLIENTS,
  updatePageSchema,
  upsertServiceSchema,
} from '@fardeen/types';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { callService } from '../common/client.util';
import type { FardeenRequest } from '../common/http';
import { ZodBody } from '../common/zod-body.pipe';

const updateProjectBodySchema = createProjectSchema.partial();
const listQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  category: z.string().optional(),
  featured: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
});
const contactStatusSchema = z.object({ status: z.enum(['new', 'read', 'archived']) });
const quotationStatusSchema = z.object({
  status: z.enum(['requested', 'reviewing', 'quoted', 'won', 'lost']),
});

/**
 * Admin panel surface (/api/v1/admin). Every route requires a Bearer token and the editor or admin
 * role (deletes are admin-only). Routes forward to the admin-service BFF, which composes read
 * models and forwards commands to the owning services. Bodies use the shared Zod schemas; the
 * global filter + response envelope are reused.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
export class AdminGatewayController {
  constructor(@Inject(SERVICE_CLIENTS.admin) private readonly client: ClientProxy) {}

  @Get('dashboard')
  dashboard(): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.dashboard, {});
  }

  // ---- Projects (incl drafts) ----
  @Get('projects')
  projectsList(@Query() query: unknown): Promise<unknown> {
    const q = listQuerySchema.parse(query);
    return callService(this.client, ADMIN_PATTERNS.projectsList, {
      category: q.category,
      featured: q.featured,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
  }

  @Get('projects/:id')
  projectsGet(@Param('id') id: string): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.projectsGet, { id });
  }

  @Post('projects')
  projectsCreate(
    @Body(new ZodBody(createProjectSchema)) body: Record<string, unknown>,
    @Req() req: FardeenRequest,
  ): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.projectsCreate, {
      ...body,
      correlationId: req.correlationId,
    });
  }

  @Patch('projects/:id')
  projectsUpdate(
    @Param('id') id: string,
    @Body(new ZodBody(updateProjectBodySchema)) body: Record<string, unknown>,
    @Req() req: FardeenRequest,
  ): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.projectsUpdate, {
      ...body,
      id,
      correlationId: req.correlationId,
    });
  }

  @Delete('projects/:id')
  @Roles('admin') // deletes are admin-only
  projectsRemove(@Param('id') id: string): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.projectsRemove, { id });
  }

  // ---- Services (incl inactive; POST/PATCH both upsert by slug) ----
  @Get('services')
  servicesList(): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.servicesList, {});
  }

  @Post('services')
  servicesCreate(
    @Body(new ZodBody(upsertServiceSchema)) body: Record<string, unknown>,
    @Req() req: FardeenRequest,
  ): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.servicesUpsert, {
      ...body,
      correlationId: req.correlationId,
    });
  }

  @Patch('services/:slug')
  servicesUpdate(
    @Param('slug') slug: string,
    @Body(new ZodBody(upsertServiceSchema)) body: Record<string, unknown>,
    @Req() req: FardeenRequest,
  ): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.servicesUpsert, {
      ...body,
      slug,
      correlationId: req.correlationId,
    });
  }

  // ---- Pages (get incl draft; publish separate) ----
  @Get('pages')
  pagesList(): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.pagesList, {});
  }

  @Get('pages/:slug')
  pagesGet(@Param('slug') slug: string): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.pagesGet, { slug });
  }

  @Patch('pages/:slug')
  pagesUpdate(
    @Param('slug') slug: string,
    @Body(new ZodBody(updatePageSchema)) body: Record<string, unknown>,
    @Req() req: FardeenRequest,
  ): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.pagesUpdate, {
      ...body,
      slug,
      correlationId: req.correlationId,
    });
  }

  @Post('pages/:slug/publish')
  pagesPublish(@Param('slug') slug: string, @Req() req: FardeenRequest): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.pagesPublish, {
      slug,
      correlationId: req.correlationId,
    });
  }

  // ---- Contacts ----
  @Get('contacts')
  contactsList(@Query() query: unknown): Promise<unknown> {
    const q = listQuerySchema.parse(query);
    return callService(this.client, ADMIN_PATTERNS.contactsList, {
      status: q.status,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
  }

  @Patch('contacts/:id')
  contactsSetStatus(
    @Param('id') id: string,
    @Body(new ZodBody(contactStatusSchema)) body: { status: string },
  ): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.contactsSetStatus, { id, status: body.status });
  }

  // ---- Quotations ----
  @Get('quotations')
  quotationsList(@Query() query: unknown): Promise<unknown> {
    const q = listQuerySchema.parse(query);
    return callService(this.client, ADMIN_PATTERNS.quotationsList, {
      status: q.status,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
  }

  @Get('quotations/:id')
  quotationsGet(@Param('id') id: string): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.quotationsGet, { id });
  }

  @Patch('quotations/:id')
  quotationsSetStatus(
    @Param('id') id: string,
    @Body(new ZodBody(quotationStatusSchema)) body: { status: string },
    @Req() req: FardeenRequest,
  ): Promise<unknown> {
    return callService(this.client, ADMIN_PATTERNS.quotationsSetStatus, {
      id,
      status: body.status,
      correlationId: req.correlationId,
    });
  }
}
