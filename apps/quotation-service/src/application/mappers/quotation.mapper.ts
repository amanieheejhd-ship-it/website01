import type { QuotationRequestDto } from '@fardeen/types';
import type { QuotationRequest } from '../../domain/entities/quotation-request.entity';

export function toQuotationDto(q: QuotationRequest): QuotationRequestDto {
  return {
    id: q.id,
    contact: { name: q.contact.name, email: q.contact.email, phone: q.contact.phone },
    serviceSlugs: q.serviceSlugs,
    projectType: q.projectType,
    budgetRange: q.budgetRange
      ? { min: q.budgetRange.min, max: q.budgetRange.max, currency: q.budgetRange.currency }
      : null,
    timeline: q.timeline,
    details: q.details,
    attachments: q.attachments,
    status: q.status,
    lineItems: q.lineItems.map((li) => ({
      id: li.id,
      label: li.label,
      qty: li.qty,
      unitPrice: li.unitPrice.amount,
      currency: li.unitPrice.currency,
    })),
    total: q.total,
    createdAt: q.createdAt.toISOString(),
  };
}
