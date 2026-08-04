import type {
  ApiMeta,
  CategoryDto,
  ContactSubmissionDto,
  PageDto,
  PaginationMeta,
  ProjectDto,
  ProjectListItemDto,
  QuotationRequestDto,
  RequestQuotationInput,
  ResolveManyResult,
  ServiceOfferingDto,
  SubmitContactInput,
  TestimonialDto,
} from '@fardeen/types';

/**
 * Typed client for the public gateway (docs/API-CONTRACTS.md). Base url comes from
 * NEXT_PUBLIC_API_BASE_URL and falls back to the native-dev gateway. GET helpers are safe
 * to call from Server Components (RSC initial paint); POST helpers run from client forms.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'
).replace(/\/$/, '');

/** Gateway response envelopes: `{ data, included?: { media }, meta }`. */
export interface Included {
  media?: ResolveManyResult;
}
export interface ContentResponse<T> {
  data: T;
  included?: Included;
  meta: ApiMeta;
}
export interface ListResponse<T> {
  data: T[];
  included?: Included;
  meta: ApiMeta;
}
export interface PaginatedResponse<T> {
  data: T[];
  included?: Included;
  meta: PaginationMeta;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined>;

function toQueryString(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (cause) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the API', [String(cause)]);
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const errBody = (json as { error?: { code?: string; message?: string; details?: unknown[] } })
      ?.error;
    throw new ApiError(
      res.status,
      errBody?.code ?? 'HTTP_ERROR',
      errBody?.message ?? res.statusText,
      errBody?.details,
    );
  }
  return json as T;
}

/** RSC GET with ISR revalidation (content changes rarely; forms use client mutations). */
function get<T>(path: string, query?: Query, revalidate = 60): Promise<T> {
  return request<T>(`${path}${toQueryString(query)}`, {
    method: 'GET',
    next: { revalidate },
  });
}

// ---- Reads (Server Components) ----
export const getServices = () => get<ListResponse<ServiceOfferingDto>>('/services');
export const getService = (slug: string) =>
  get<ContentResponse<ServiceOfferingDto>>(`/services/${encodeURIComponent(slug)}`);

export const getProjects = (query?: {
  category?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}) => get<PaginatedResponse<ProjectListItemDto>>('/projects', query);

export const getCategories = () => get<ListResponse<CategoryDto>>('/projects/categories');
export const getProject = (slug: string) =>
  get<ContentResponse<ProjectDto>>(`/projects/${encodeURIComponent(slug)}`);

export const getHomePage = () => get<ContentResponse<PageDto>>('/pages/home');
export const getTestimonials = (featured?: boolean) =>
  get<ListResponse<TestimonialDto>>('/testimonials', featured ? { featured } : undefined);

// ---- Writes (client forms) ----
/** RFC4122 idempotency key so a double-submit is a safe no-op at the gateway. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function submitContact(
  input: SubmitContactInput,
  idempotencyKey: string,
): Promise<ContentResponse<ContactSubmissionDto>> {
  return request<ContentResponse<ContactSubmissionDto>>('/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  });
}

export function submitQuotation(
  input: RequestQuotationInput,
  idempotencyKey: string,
): Promise<ContentResponse<QuotationRequestDto>> {
  return request<ContentResponse<QuotationRequestDto>>('/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  });
}
