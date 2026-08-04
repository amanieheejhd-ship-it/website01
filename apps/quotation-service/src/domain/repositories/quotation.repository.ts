import type { QuotationStatus } from '@fardeen/types';
import type { QuotationRequest } from '../entities/quotation-request.entity';

export const QUOTATION_REPOSITORY = Symbol('QUOTATION_REPOSITORY');

export interface QuotationRepository {
  findByIdempotencyKey(key: string): Promise<QuotationRequest | null>;
  findById(id: string): Promise<QuotationRequest | null>;
  save(quotation: QuotationRequest): Promise<void>;
  list(filter: { status?: QuotationStatus; page: number; limit: number }): Promise<{
    items: QuotationRequest[];
    total: number;
  }>;
  /** Counts grouped by status + total (admin dashboard). */
  countByStatus(): Promise<{ byStatus: Record<QuotationStatus, number>; total: number }>;
}
