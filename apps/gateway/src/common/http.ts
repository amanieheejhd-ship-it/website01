import type { AccessTokenClaims } from '@fardeen/types';
import type { Request } from 'express';

/** Express request enriched by correlation middleware + the JWT guard. */
export interface FardeenRequest extends Request {
  correlationId?: string;
  requestId?: string;
  user?: AccessTokenClaims;
  cookies: Record<string, string>;
}
