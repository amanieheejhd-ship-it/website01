import type { QuotationStatus } from './quotation';

/**
 * Admin BFF read models (admin-service, ADR-005). admin-service composes these from the owning
 * services and holds no persistent state. Command DTOs reuse the owning-service payloads/schemas
 * (create/update project, upsert service, set status, update page …) — see the domain files.
 */

/** Aggregated counters for the admin dashboard tiles. */
export interface DashboardCounters {
  contacts: { new: number; total: number };
  quotations: { byStatus: Record<QuotationStatus, number>; total: number };
  projects: { published: number; total: number };
  services: { active: number; total: number };
  /** ISO timestamp the snapshot was composed (a short Redis cache may serve it for a few seconds). */
  generatedAt: string;
}
