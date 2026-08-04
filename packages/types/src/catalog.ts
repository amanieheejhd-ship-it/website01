import { z } from 'zod';

/** Service Catalog contracts — service-management owns service_db (docs/DOMAIN-MODEL.md §Service Catalog). */

export interface FeatureDto {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface PricingTierDto {
  id: string;
  name: string;
  priceFrom: number; // minor units (paise)
  currency: string;
  unit: string;
  inclusions: string[];
}

export interface ServiceOfferingDto {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  heroMediaId: string | null; // unresolved reference id (media-service resolves in 4b-2)
  order: number;
  active: boolean;
  features: FeatureDto[];
  pricingTiers: PricingTierDto[];
}

// ---- admin upsert (service side + seed; gateway exposes it in Phase 7) ----
export const upsertServiceSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1),
  tagline: z.string().default(''),
  description: z.string().default(''),
  icon: z.string().default(''),
  heroMediaId: z.string().nullable().optional(),
  order: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
  features: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().default(''),
        order: z.coerce.number().int().default(0),
      }),
    )
    .default([]),
  pricingTiers: z
    .array(
      z.object({
        name: z.string().min(1),
        priceFrom: z.coerce.number().int().nonnegative(),
        currency: z.string().default('INR'),
        unit: z.string().default(''),
        inclusions: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});
export type UpsertServiceInput = z.infer<typeof upsertServiceSchema>;
export type UpsertServicePayload = UpsertServiceInput & { correlationId?: string };

export interface GetServiceBySlugPayload {
  slug: string;
}
