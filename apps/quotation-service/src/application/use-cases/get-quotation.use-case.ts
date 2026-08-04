import { err, type GetQuotationPayload, ok, type QuotationRequestDto, type Result } from '@fardeen/types';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import { toQuotationDto } from '../mappers/quotation.mapper';

export class GetQuotation {
  constructor(private readonly repo: QuotationRepository) {}

  async execute(payload: GetQuotationPayload): Promise<Result<QuotationRequestDto>> {
    const quotation = await this.repo.findById(payload.id);
    if (!quotation) {
      return err({ code: 'QUOTATION_NOT_FOUND', message: 'Quotation request not found' });
    }
    return ok(toQuotationDto(quotation));
  }
}
