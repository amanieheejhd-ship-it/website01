import { randomUUID } from 'node:crypto';
import {
  EVENTS,
  ok,
  type QuotationRequestDto,
  type RequestQuotationPayload,
  type Result,
} from '@fardeen/types';
import { QuotationRequest } from '../../domain/entities/quotation-request.entity';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import { BudgetRange } from '../../domain/value-objects/budget-range.vo';
import { QuoteContact } from '../../domain/value-objects/quote-contact.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { toQuotationDto } from '../mappers/quotation.mapper';
import { toErr } from '../result.util';

/** Idempotent quote request → emits quotation.requested. */
export class RequestQuotation {
  constructor(
    private readonly repo: QuotationRepository,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: RequestQuotationPayload): Promise<Result<QuotationRequestDto>> {
    try {
      const existing = await this.repo.findByIdempotencyKey(payload.idempotencyKey);
      if (existing) {
        return ok(toQuotationDto(existing));
      }
      const quotation = QuotationRequest.create({
        id: randomUUID(),
        contact: QuoteContact.create(payload.contact),
        serviceSlugs: payload.serviceSlugs,
        projectType: payload.projectType,
        budgetRange: payload.budgetRange
          ? BudgetRange.of(payload.budgetRange.min, payload.budgetRange.max, payload.budgetRange.currency)
          : null,
        timeline: payload.timeline,
        details: payload.details,
        attachments: payload.attachments,
        status: 'requested',
        lineItems: [],
        idempotencyKey: payload.idempotencyKey,
        createdAt: new Date(),
      });
      await this.repo.save(quotation);
      await this.events.publish({
        name: EVENTS.quotationRequested,
        correlationId: payload.correlationId,
        data: { quotationId: quotation.id, email: quotation.contact.email },
      });
      return ok(toQuotationDto(quotation));
    } catch (e) {
      return toErr(e);
    }
  }
}
