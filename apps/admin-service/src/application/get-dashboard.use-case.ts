import {
  CONTACT_PATTERNS,
  type DashboardCounters,
  ok,
  type ProjectListResult,
  PROJECT_PATTERNS,
  type QuotationStats,
  QUOTATION_PATTERNS,
  type Result,
  SERVICE_PATTERNS,
  type ServiceOfferingDto,
} from '@fardeen/types';
import type { DashboardCache } from './ports/dashboard-cache.port';
import type { Downstream } from './ports/downstream.port';

const EMPTY_STATS: QuotationStats = {
  byStatus: { requested: 0, reviewing: 0, quoted: 0, won: 0, lost: 0 },
  total: 0,
};

/**
 * Composes the admin dashboard by fanning out to the owning services (counts only) and caching
 * the snapshot briefly. Any single service being unavailable degrades that tile to 0 rather than
 * failing the whole dashboard.
 */
export class GetDashboard {
  constructor(
    private readonly downstream: Downstream,
    private readonly cache: DashboardCache,
    private readonly cacheTtl: number,
  ) {}

  async execute(): Promise<Result<DashboardCounters>> {
    const cached = await this.cache.get();
    if (cached) return ok(cached);

    const [projectsAll, projectsPub, servicesActive, servicesAll, contactsTotal, contactsNew, quotationStats] =
      await Promise.all([
        this.safe(
          this.downstream.call<ProjectListResult>('project', PROJECT_PATTERNS.list, {
            includeUnpublished: true,
            page: 1,
            limit: 1,
          }),
          null,
        ),
        this.safe(
          this.downstream.call<ProjectListResult>('project', PROJECT_PATTERNS.list, {
            includeUnpublished: false,
            page: 1,
            limit: 1,
          }),
          null,
        ),
        this.safe(this.downstream.call<ServiceOfferingDto[]>('service', SERVICE_PATTERNS.list, {}), []),
        this.safe(this.downstream.call<ServiceOfferingDto[]>('service', SERVICE_PATTERNS.listAll, {}), []),
        this.safe(
          this.downstream.call<{ total: number }>('contact', CONTACT_PATTERNS.list, { page: 1, limit: 1 }),
          null,
        ),
        this.safe(
          this.downstream.call<{ total: number }>('contact', CONTACT_PATTERNS.list, {
            status: 'new',
            page: 1,
            limit: 1,
          }),
          null,
        ),
        this.safe(this.downstream.call<QuotationStats>('quotation', QUOTATION_PATTERNS.stats, {}), EMPTY_STATS),
      ]);

    const counters: DashboardCounters = {
      contacts: { new: contactsNew?.total ?? 0, total: contactsTotal?.total ?? 0 },
      quotations: { byStatus: quotationStats.byStatus, total: quotationStats.total },
      projects: { published: projectsPub?.total ?? 0, total: projectsAll?.total ?? 0 },
      services: { active: servicesActive.length, total: servicesAll.length },
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(counters, this.cacheTtl);
    return ok(counters);
  }

  /** Unwrap a downstream Result, degrading to `fallback` on domain error or transport failure. */
  private async safe<T, F>(p: Promise<Result<T>>, fallback: F): Promise<T | F> {
    try {
      const r = await p;
      return r.ok ? r.data : fallback;
    } catch {
      return fallback;
    }
  }
}
