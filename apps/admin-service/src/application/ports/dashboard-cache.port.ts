import type { DashboardCounters } from '@fardeen/types';

export const DASHBOARD_CACHE = Symbol('DASHBOARD_CACHE');

/** Short-lived cache for the dashboard snapshot (the only thing admin-service persists — Redis, TTL'd). */
export interface DashboardCache {
  get(): Promise<DashboardCounters | null>;
  set(value: DashboardCounters, ttlSeconds: number): Promise<void>;
}
