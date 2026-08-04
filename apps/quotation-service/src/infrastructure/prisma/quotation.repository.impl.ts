import { Injectable } from '@nestjs/common';
import type { QuotationStatus } from '@fardeen/types';
import { QuotationRequest } from '../../domain/entities/quotation-request.entity';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import { BudgetRange } from '../../domain/value-objects/budget-range.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { QuoteContact } from '../../domain/value-objects/quote-contact.vo';
import { PrismaService } from './prisma.service';

interface LineItemRow {
  id: string;
  label: string;
  qty: number;
  unitPrice: number;
  currency: string;
}
interface QuotationRow {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  serviceSlugs: string[];
  projectType: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string | null;
  timeline: string;
  details: string;
  attachments: string[];
  status: string;
  idempotencyKey: string;
  createdAt: Date;
  lineItems: LineItemRow[];
}

@Injectable()
export class PrismaQuotationRepository implements QuotationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(key: string): Promise<QuotationRequest | null> {
    const r = await this.prisma.quotationRequest.findUnique({
      where: { idempotencyKey: key },
      include: { lineItems: true },
    });
    return r ? this.toDomain(r as QuotationRow) : null;
  }

  async findById(id: string): Promise<QuotationRequest | null> {
    const r = await this.prisma.quotationRequest.findUnique({
      where: { id },
      include: { lineItems: true },
    });
    return r ? this.toDomain(r as QuotationRow) : null;
  }

  async save(q: QuotationRequest): Promise<void> {
    const lineItems = q.lineItems.map((li) => ({
      id: li.id,
      label: li.label,
      qty: li.qty,
      unitPrice: li.unitPrice.amount,
      currency: li.unitPrice.currency,
    }));
    const base = {
      contactName: q.contact.name,
      contactEmail: q.contact.email,
      contactPhone: q.contact.phone,
      serviceSlugs: q.serviceSlugs,
      projectType: q.projectType,
      budgetMin: q.budgetRange?.min ?? null,
      budgetMax: q.budgetRange?.max ?? null,
      budgetCurrency: q.budgetRange?.currency ?? null,
      timeline: q.timeline,
      details: q.details,
      attachments: q.attachments,
      status: q.status,
    };
    await this.prisma.quotationRequest.upsert({
      where: { id: q.id },
      create: { id: q.id, ...base, idempotencyKey: q.idempotencyKey, createdAt: q.createdAt, lineItems: { create: lineItems } },
      update: { ...base, lineItems: { deleteMany: {}, create: lineItems } },
    });
  }

  async list(filter: {
    status?: QuotationStatus;
    page: number;
    limit: number;
  }): Promise<{ items: QuotationRequest[]; total: number }> {
    const where = filter.status ? { status: filter.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.quotationRequest.findMany({
        where,
        include: { lineItems: true },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.quotationRequest.count({ where }),
    ]);
    return { items: rows.map((r: QuotationRow) => this.toDomain(r)), total };
  }

  async countByStatus(): Promise<{ byStatus: Record<QuotationStatus, number>; total: number }> {
    const groups = await this.prisma.quotationRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus: Record<QuotationStatus, number> = {
      requested: 0,
      reviewing: 0,
      quoted: 0,
      won: 0,
      lost: 0,
    };
    let total = 0;
    for (const g of groups) {
      const count = g._count._all;
      total += count;
      if (g.status in byStatus) byStatus[g.status as QuotationStatus] = count;
    }
    return { byStatus, total };
  }

  private toDomain(r: QuotationRow): QuotationRequest {
    return QuotationRequest.rehydrate({
      id: r.id,
      contact: QuoteContact.create({ name: r.contactName, email: r.contactEmail, phone: r.contactPhone }),
      serviceSlugs: r.serviceSlugs,
      projectType: r.projectType,
      budgetRange:
        r.budgetMin != null && r.budgetMax != null
          ? BudgetRange.of(r.budgetMin, r.budgetMax, r.budgetCurrency ?? 'INR')
          : null,
      timeline: r.timeline,
      details: r.details,
      attachments: r.attachments,
      status: r.status as QuotationStatus,
      lineItems: (r.lineItems ?? []).map((li) => ({
        id: li.id,
        label: li.label,
        qty: li.qty,
        unitPrice: Money.of(li.unitPrice, li.currency),
      })),
      idempotencyKey: r.idempotencyKey,
      createdAt: r.createdAt,
    });
  }
}
