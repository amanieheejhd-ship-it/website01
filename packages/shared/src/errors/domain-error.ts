import type { AppError } from '@fardeen/types';

/**
 * Base domain error. Services throw subclasses; the gateway's shared exception filter
 * maps `code` → HTTP status (docs/ARCHITECTURE.md §6, §9). Stack traces never leak.
 */
export class DomainError extends Error implements AppError {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = new.target.name;
  }

  toAppError(): AppError {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, `${resource} not found`);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown[]) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('CONFLICT', message);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message);
  }
}
