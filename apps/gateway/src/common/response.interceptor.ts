import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { FardeenRequest } from './http';

/** Wraps successful controller returns in the success envelope { data, meta:{ requestId } }. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FardeenRequest>();
    const requestId = req.requestId ?? 'unknown';
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return data; // already an envelope
        }
        return { data, meta: { requestId } };
      }),
    );
  }
}
