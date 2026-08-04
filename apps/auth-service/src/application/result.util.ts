import { DomainError } from '@fardeen/shared';
import { err, type Result } from '@fardeen/types';

/** Map a thrown DomainError to the Result envelope; rethrow anything unexpected (→ 5xx upstream). */
export function toErr(e: unknown): Result<never> {
  if (e instanceof DomainError) return err(e.toAppError());
  throw e;
}
