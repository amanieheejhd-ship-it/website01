import { z } from 'zod';

/** Content contracts — cms-service owns cms_db (docs/DOMAIN-MODEL.md §Content). */

export type PageStatus = 'draft' | 'published';
export type SectionType = 'hero' | 'scene' | 'richText' | 'gallery' | 'cta';

export interface SectionDto {
  id: string;
  type: SectionType;
  order: number;
  payload: unknown; // typed JSON per section type
  mediaRefs: string[]; // unresolved reference ids
}

export interface SeoDto {
  title: string;
  description: string;
  ogImageMediaId: string | null;
}

export interface PageDto {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  seo: SeoDto;
  sections: SectionDto[]; // ordered
}

export interface TestimonialDto {
  id: string;
  author: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  avatarMediaId: string | null;
  featured: boolean;
}

export interface GetPagePayload {
  slug: string;
  includeUnpublished?: boolean;
}

export const listTestimonialsQuerySchema = z.object({
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type ListTestimonialsQuery = z.infer<typeof listTestimonialsQuerySchema>;
export type ListTestimonialsPayload = ListTestimonialsQuery;

export interface PublishPagePayload {
  slug: string;
  correlationId?: string;
}

// ---- admin views (cms owns the write; admin-service only forwards) ----

/** A page summary for the admin pages list (no sections). */
export interface AdminPageListItem {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
}

/** Admin: replace a page's editable content (title, seo, ordered sections). */
export const updatePageSchema = z.object({
  title: z.string().min(1).max(160),
  seo: z.object({
    title: z.string().max(160).default(''),
    description: z.string().max(320).default(''),
    ogImageMediaId: z.string().nullable().optional(),
  }),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum(['hero', 'scene', 'richText', 'gallery', 'cta']),
        order: z.coerce.number().int().nonnegative(),
        payload: z.unknown(),
        mediaRefs: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type UpdatePagePayload = UpdatePageInput & { slug: string; correlationId?: string };
