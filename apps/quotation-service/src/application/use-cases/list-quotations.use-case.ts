import { type ListQuotationsPayload, ok, type QuotationRequestDto, type Result } from '@fardeen/types';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import { toQuotationDto } from '../mappers/quotation.mapper';

export interface QuotationListResult {
  items: QuotationRequestDto[];
  page: number;
  limit: number;
  total: number;
}

export class ListQuotations {
  constructor(private readonly repo: QuotationRepository) {}

  async execute(payload: ListQuotationsPayload): Promise<Result<QuotationListResult>> {
    const page = payload.page ?? 1;
    const limit = payload.limit ?? 20;
    const { items, total } = await this.repo.list({ status: payload.status, page, limit });
    return ok({ items: items.map(toQuotationDto), page, limit, total });
  }
}
