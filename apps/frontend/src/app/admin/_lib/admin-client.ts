/**
 * Client-side admin data layer. The browser ONLY ever calls our same-origin /api/admin/* proxy —
 * never the gateway or the services directly (guardrail) — so no tokens, headers, or CORS live here.
 * The proxy attaches the Bearer token from httpOnly cookies and refreshes it transparently.
 * Every helper returns the unwrapped `data` from the gateway envelope, or throws `ApiError`.
 */
import { ApiError } from '../../../lib/api';

export { ApiError };
import type {
  AdminPageListItem,
  ContactStatus,
  ContactSubmissionDto,
  DashboardCounters,
  PageDto,
  ProjectDto,
  ProjectListResult,
  QuotationRequestDto,
  QuotationStatus,
  ServiceOfferingDto,
  UpdatePageInput,
} from '@fardeen/types';
import type { z } from 'zod';
import type { createProjectSchema, upsertServiceSchema } from '@fardeen/types';

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = Partial<CreateProjectInput>;
export type UpsertServiceInput = z.infer<typeof upsertServiceSchema>;

type ListPage<T> = { items: T[]; page: number; limit: number; total: number };

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (cause) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server', [String(cause)]);
  }
  const json: unknown = await res.json().catch(() => null);
  if (res.status === 401 && typeof window !== 'undefined') {
    // Session expired and could not be refreshed — bounce to login.
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/admin/login?next=${next}`;
  }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: unknown[] } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? res.statusText, err?.details);
  }
  return (json as { data: T }).data;
}

export interface ProjectListQuery {
  category?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}
export interface TriageQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export const adminApi = {
  dashboard: () => adminFetch<DashboardCounters>('dashboard'),

  projects: {
    list: (q: ProjectListQuery = {}) => adminFetch<ProjectListResult>(`projects${qs({ ...q })}`),
    get: (id: string) => adminFetch<ProjectDto>(`projects/${id}`),
    create: (body: CreateProjectInput) => adminFetch<ProjectDto>('projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: UpdateProjectInput) => adminFetch<ProjectDto>(`projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => adminFetch<{ removed: boolean }>(`projects/${id}`, { method: 'DELETE' }),
  },

  services: {
    list: () => adminFetch<ServiceOfferingDto[]>('services'),
    upsert: (body: UpsertServiceInput) => adminFetch<ServiceOfferingDto>('services', { method: 'POST', body: JSON.stringify(body) }),
    update: (slug: string, body: UpsertServiceInput) => adminFetch<ServiceOfferingDto>(`services/${slug}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },

  pages: {
    list: () => adminFetch<AdminPageListItem[]>('pages'),
    get: (slug: string) => adminFetch<PageDto>(`pages/${slug}`),
    update: (slug: string, body: UpdatePageInput) => adminFetch<PageDto>(`pages/${slug}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publish: (slug: string) => adminFetch<PageDto>(`pages/${slug}/publish`, { method: 'POST' }),
  },

  contacts: {
    list: (q: TriageQuery = {}) => adminFetch<ListPage<ContactSubmissionDto>>(`contacts${qs({ ...q })}`),
    setStatus: (id: string, status: ContactStatus) => adminFetch<ContactSubmissionDto>(`contacts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },

  quotations: {
    list: (q: TriageQuery = {}) => adminFetch<ListPage<QuotationRequestDto>>(`quotations${qs({ ...q })}`),
    get: (id: string) => adminFetch<QuotationRequestDto>(`quotations/${id}`),
    setStatus: (id: string, status: QuotationStatus) => adminFetch<QuotationRequestDto>(`quotations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
};

/** Stable query keys for TanStack Query. */
export const qk = {
  dashboard: ['admin', 'dashboard'] as const,
  projects: (q?: ProjectListQuery) => ['admin', 'projects', q ?? {}] as const,
  project: (id: string) => ['admin', 'project', id] as const,
  services: ['admin', 'services'] as const,
  service: (slug: string) => ['admin', 'service', slug] as const,
  pages: ['admin', 'pages'] as const,
  page: (slug: string) => ['admin', 'page', slug] as const,
  contacts: (q?: TriageQuery) => ['admin', 'contacts', q ?? {}] as const,
  quotations: (q?: TriageQuery) => ['admin', 'quotations', q ?? {}] as const,
  quotation: (id: string) => ['admin', 'quotation', id] as const,
};
