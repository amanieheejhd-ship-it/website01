import { ok, type QuotationStats, type Result } from '@fardeen/types';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';

/** Admin dashboard: quotation counts grouped by status + total. */
export class GetQuotationStats {
  constructor(private readonly repo: QuotationRepository) {}

  async execute(): Promise<Result<QuotationStats>> {
    const stats = await this.repo.countByStatus();
    return ok(stats);
  }
}
