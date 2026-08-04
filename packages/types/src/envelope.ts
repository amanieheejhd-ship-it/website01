/**
 * Response envelope + internal Result type (docs/API-CONTRACTS.md §Response Envelope,
 * docs/ARCHITECTURE.md §6 Error model).
 */

export interface ApiMeta {
  requestId: string;
}

export interface PaginationMeta extends ApiMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiPaginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: ApiMeta;
}

/**
 * Discriminated result returned by every service over the TCP transport. The gateway
 * maps `{ ok: false }` domain errors to HTTP status codes via a shared exception filter.
 */
export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export interface AppError {
  code: string;
  message: string;
  details?: unknown[];
}

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
export const err = <E = AppError>(error: E): Result<never, E> => ({ ok: false, error });
