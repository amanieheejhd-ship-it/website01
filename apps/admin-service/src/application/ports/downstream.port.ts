import type { Result } from '@fardeen/types';

export const DOWNSTREAM = Symbol('DOWNSTREAM');

export type DownstreamService =
  | 'project'
  | 'service'
  | 'cms'
  | 'contact'
  | 'quotation'
  | 'media';

/**
 * Outbound port: send a message pattern to an owning service and get its `Result<T>` back
 * (un-unwrapped — the admin-service forwards the Result through to the gateway). The TCP adapter
 * lives in infrastructure; application stays transport-agnostic.
 */
export interface Downstream {
  call<T>(service: DownstreamService, pattern: string, payload: unknown): Promise<Result<T>>;
}
