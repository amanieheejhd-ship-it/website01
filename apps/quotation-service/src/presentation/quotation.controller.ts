import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  QUOTATION_PATTERNS,
  type GetQuotationPayload,
  type ListQuotationsPayload,
  type RequestQuotationPayload,
  type SetQuotationStatusPayload,
} from '@fardeen/types';
import { GetQuotation } from '../application/use-cases/get-quotation.use-case';
import { GetQuotationStats } from '../application/use-cases/get-quotation-stats.use-case';
import { ListQuotations } from '../application/use-cases/list-quotations.use-case';
import { RequestQuotation } from '../application/use-cases/request-quotation.use-case';
import { SetQuotationStatus } from '../application/use-cases/set-quotation-status.use-case';

@Controller()
export class QuotationController {
  constructor(
    private readonly requestQuotation: RequestQuotation,
    private readonly getQuotation: GetQuotation,
    private readonly listQuotations: ListQuotations,
    private readonly getQuotationStats: GetQuotationStats,
    private readonly setQuotationStatus: SetQuotationStatus,
  ) {}

  @MessagePattern(QUOTATION_PATTERNS.request)
  request(@Payload() payload: RequestQuotationPayload) {
    return this.requestQuotation.execute(payload);
  }

  @MessagePattern(QUOTATION_PATTERNS.get)
  get(@Payload() payload: GetQuotationPayload) {
    return this.getQuotation.execute(payload);
  }

  @MessagePattern(QUOTATION_PATTERNS.list)
  list(@Payload() payload: ListQuotationsPayload) {
    return this.listQuotations.execute(payload);
  }

  @MessagePattern(QUOTATION_PATTERNS.stats)
  stats() {
    return this.getQuotationStats.execute();
  }

  @MessagePattern(QUOTATION_PATTERNS.setStatus)
  setStatus(@Payload() payload: SetQuotationStatusPayload) {
    return this.setQuotationStatus.execute(payload);
  }
}
