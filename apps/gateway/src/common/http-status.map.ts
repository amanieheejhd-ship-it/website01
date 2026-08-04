import { HttpStatus } from '@nestjs/common';

/** Domain error code → HTTP status (docs/API-CONTRACTS.md §Response Envelope status mapping). */
export function statusForCode(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return HttpStatus.BAD_REQUEST;
    case 'INVALID_CREDENTIALS':
    case 'UNAUTHORIZED':
    case 'REFRESH_INVALID':
    case 'REFRESH_REUSE':
      return HttpStatus.UNAUTHORIZED;
    case 'FORBIDDEN':
      return HttpStatus.FORBIDDEN;
    case 'EMAIL_TAKEN':
    case 'CONFLICT':
      return HttpStatus.CONFLICT;
    default:
      return code.endsWith('_NOT_FOUND') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
  }
}

export function codeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHENTICATED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL';
  }
}
