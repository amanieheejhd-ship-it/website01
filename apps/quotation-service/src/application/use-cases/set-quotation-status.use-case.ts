import {
  EVENTS,
  err,
  ok,
  type QuotationRequestDto,
  type Result,
  type SetQuotationStatusPayload,
} from '@fardeen/types';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import type { EventPublisher } from '../ports/event-publisher.port';
import { toQuotationDto } from '../mappers/quotation.mapper';
import { toErr } from '../result.util';

/** Lifecycle transition (guarded by the aggregate) → emits quotation.statusChanged. */
export class SetQuotationStatus {
  constructor(
    private readonly repo: QuotationRepository,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: SetQuotationStatusPayload): Promise<Result<QuotationRequestDto>> {
    try {
      const quotation = await this.repo.findById(payload.id);
      if (!quotation) {
        return err({ code: 'QUOTATION_NOT_FOUND', message: 'Quotation request not found' });
      }
      const { from, to } = quotation.changeStatus(payload.status);
      await this.repo.save(quotation);
      if (from !== to) {
        await this.events.publish({
          name: EVENTS.quotationStatusChanged,
          correlationId: payload.correlationId,
          data: { quotationId: quotation.id, email: quotation.contact.email, from, to },
        });
      }
      return ok(toQuotationDto(quotation));
    } catch (e) {
      return toErr(e);
    }
  }
}
