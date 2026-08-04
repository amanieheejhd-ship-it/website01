import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import {
  QUOTATION_PATTERNS,
  type QuotationRequestDto,
  requestQuotationSchema,
  SERVICE_CLIENTS,
} from '@fardeen/types';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { callService } from '../common/client.util';
import type { FardeenRequest } from '../common/http';
import { ZodBody } from '../common/zod-body.pipe';

/** Public quote requests (Idempotency-Key, stricter rate limit); admin single-read. */
@Controller('quotations')
export class QuotationsGatewayController {
  constructor(@Inject(SERVICE_CLIENTS.quotation) private readonly client: ClientProxy) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  request(
    @Body(new ZodBody(requestQuotationSchema)) body: Record<string, unknown>,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: FardeenRequest,
  ): Promise<QuotationRequestDto> {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required',
      });
    }
    return callService<QuotationRequestDto>(this.client, QUOTATION_PATTERNS.request, {
      ...body,
      idempotencyKey,
      correlationId: req.correlationId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getById(@Param('id') id: string): Promise<QuotationRequestDto> {
    return callService<QuotationRequestDto>(this.client, QUOTATION_PATTERNS.get, { id });
  }
}
