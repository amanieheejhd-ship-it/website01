import { BadRequestException, Body, Controller, Headers, Inject, Post, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import {
  CONTACT_PATTERNS,
  type ContactSubmissionDto,
  SERVICE_CLIENTS,
  submitContactSchema,
} from '@fardeen/types';
import { callService } from '../common/client.util';
import type { FardeenRequest } from '../common/http';
import { ZodBody } from '../common/zod-body.pipe';

/** Public contact form. Requires an Idempotency-Key header; stricter rate limit (double-submit guard). */
@Controller('contact')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class ContactGatewayController {
  constructor(@Inject(SERVICE_CLIENTS.contact) private readonly client: ClientProxy) {}

  @Post()
  submit(
    @Body(new ZodBody(submitContactSchema)) body: Record<string, unknown>,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: FardeenRequest,
  ): Promise<ContactSubmissionDto> {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required',
      });
    }
    return callService<ContactSubmissionDto>(this.client, CONTACT_PATTERNS.submit, {
      ...body,
      idempotencyKey,
      correlationId: req.correlationId,
    });
  }
}
