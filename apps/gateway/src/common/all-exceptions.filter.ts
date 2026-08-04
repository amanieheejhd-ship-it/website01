import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainHttpError } from './domain-http.error';
import type { FardeenRequest } from './http';
import { codeForStatus, statusForCode } from './http-status.map';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown[];
}

/** Global filter → consistent error envelope { error, meta:{ requestId } }. Never leaks stack traces. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Gateway');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<FardeenRequest>();
    const requestId = req.requestId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ErrorBody = { code: 'INTERNAL', message: 'Internal server error' };

    if (exception instanceof DomainHttpError) {
      status = statusForCode(exception.appError.code);
      error = {
        code: exception.appError.code,
        message: exception.appError.message,
        details: exception.appError.details,
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (resp && typeof resp === 'object' && 'code' in resp) {
        const r = resp as Record<string, unknown>;
        error = {
          code: String(r.code),
          message: String(r.message ?? exception.message),
          details: Array.isArray(r.details) ? r.details : undefined,
        };
      } else {
        error = {
          code: codeForStatus(status),
          message: typeof resp === 'string' ? resp : exception.message,
        };
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({ error, meta: { requestId } });
  }
}
