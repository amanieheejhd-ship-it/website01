import { z } from 'zod';

/** Portfolio contracts — project-service owns project_db (docs/DOMAIN-MODEL.md §Portfolio). */

export type ProjectStatus = 'draft' | 'published';

export interface ProjectMetricsDto {
  area: string | null;
  durationMonths: number | null;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  order: number;
}

export interface ProjectListItemDto {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  location: string;
  year: number;
  coverMediaId: string | null;
  status: ProjectStatus;
  featured: boolean;
  metrics: ProjectMetricsDto;
}

export interface ProjectDto extends ProjectListItemDto {
  body: string;
  galleryMediaIds: string[]; // unresolved reference ids
}

/** Paginated list result (rides ApiPaginated envelope at the gateway → meta.page/limit/total). */
export interface ProjectListResult {
  items: ProjectListItemDto[];
  page: number;
  limit: number;
  total: number;
}

// public list query (coerced from the query string at the gateway edge)
export const projectListQuerySchema = z.object({
  category: z.string().optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export interface ProjectListPayload extends ProjectListQuery {
  includeUnpublished?: boolean; // false for public reads
}

export interface GetProjectBySlugPayload {
  slug: string;
  includeUnpublished?: boolean;
}

export interface GetProjectByIdPayload {
  id: string;
}

// ---- admin create/update (service side + seed) ----
export const createProjectSchema = z.object({
  slug: z.string().min(1).max(120),
  title: z.string().min(1),
  summary: z.string().default(''),
  body: z.string().default(''),
  categoryId: z.string().min(1),
  location: z.string().default(''),
  year: z.coerce.number().int(),
  coverMediaId: z.string().nullable().optional(),
  galleryMediaIds: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  featured: z.boolean().default(false),
  metrics: z
    .object({
      area: z.string().nullable().optional(),
      durationMonths: z.coerce.number().int().nullable().optional(),
    })
    .default({}),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProjectPayload = CreateProjectInput & { correlationId?: string };
export type UpdateProjectPayload = Partial<CreateProjectInput> & { id: string; correlationId?: string };
export interface RemoveProjectPayload {
  id: string;
}
