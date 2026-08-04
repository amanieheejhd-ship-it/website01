import type { AppError } from '@fardeen/types';

/** Carries a service-returned domain AppError up to the exception filter for HTTP mapping. */
export class DomainHttpError extends Error {
  constructor(public readonly appError: AppError) {
    super(appError.message);
    this.name = 'DomainHttpError';
  }
}
