import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '@fardeen/shared';
import type { NextFunction, Response } from 'express';
import type { FardeenRequest } from './http';

/** Assigns/propagates a correlation id + a per-request id (echoed on the response, forwarded to
 *  services in message payloads, and used in the response/error envelope meta). */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: FardeenRequest, res: Response, next: NextFunction): void {
    const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();
    const requestId = randomUUID();
    req.correlationId = correlationId;
    req.requestId = requestId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
