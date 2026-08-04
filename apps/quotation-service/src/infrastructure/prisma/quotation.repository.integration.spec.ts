/**
 * Integration — PrismaQuotationRepository + RequestQuotation use-case against the REAL native
 * Postgres (quotation_db_test). Proves the nested line-item mapping, the derived total, the
 * line-item replace-on-update, the unique idempotency_key constraint, list()/countByStatus, and
 * use-case idempotency (with a mocked EventPublisher — no Redis).
 */
import { randomUUID } from 'node:crypto';
import type { QuotationStatus, RequestQuotationPayload } from '@fardeen/types';
import {
  QuotationRequest,
  type QuoteLineItem,
} from '../../domain/entities/quotation-request.entity';
import { RequestQuotation } from '../../application/use-cases/request-quotation.use-case';
import type { EventPublisher } from '../../application/ports/event-publisher.port';
import { Money } from '../../domain/value-objects/money.vo';
import { QuoteContact } from '../../domain/value-objects/quote-contact.vo';
import { testDbUrl, truncate } from '../../../../../test/integration/support';
import { PrismaService } from './prisma.service';
import { PrismaQuotationRepository } from './quotation.repository.impl';

function lineItem(over: Partial<QuoteLineItem> & { label: string; qty: number; unitPrice: number }): QuoteLineItem {
  return {
    id: over.id ?? randomUUID(),
    label: over.label,
    qty: over.qty,
    unitPrice: Money.of(over.unitPrice, 'INR'),
  };
}

function makeQuotation(over: {
  id?: string;
  idempotencyKey?: string;
  status?: QuotationStatus;
  lineItems?: QuoteLineItem[];
}): QuotationRequest {
  return QuotationRequest.create({
    id: over.id ?? randomUUID(),
    contact: QuoteContact.create({ name: 'Asha Rao', email: 'asha@example.com', phone: '+91 90000 12345' }),
    serviceSlugs: ['interior-design'],
    projectType: 'residential',
    budgetRange: null,
    timeline: '3 months',
    details: 'Full home interior',
    attachments: [],
    status: over.status ?? 'requested',
    lineItems: over.lineItems ?? [],
    idempotencyKey: over.idempotencyKey ?? randomUUID(),
    createdAt: new Date(),
  });
}

describe('PrismaQuotationRepository (integration · real Postgres quotation_db_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaQuotationRepository;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('quotation_db_test'));
    await prisma.$connect();
    repo = new PrismaQuotationRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), ['quote_line_items', 'quotation_requests']);
  });

  it('round-trips a quotation WITH line items and reconstructs the derived total = Σ(qty × unitPrice)', async () => {
    const q = makeQuotation({
      lineItems: [
        lineItem({ label: 'Design fee', qty: 1, unitPrice: 50000 }),
        lineItem({ label: 'Modular kitchen', qty: 2, unitPrice: 120000 }),
        lineItem({ label: 'Lighting fixtures', qty: 5, unitPrice: 3000 }),
      ],
    });
    await repo.save(q);

    const found = await repo.findById(q.id);
    expect(found).not.toBeNull();
    expect(found!.lineItems).toHaveLength(3);
    // total is DERIVED from the reloaded rows, not a stored column
    // 1*50000 + 2*120000 + 5*3000 = 50000 + 240000 + 15000 = 305000
    expect(found!.total).toBe(305000);

    const byLabel = new Map(found!.lineItems.map((li) => [li.label, li]));
    expect(byLabel.get('Modular kitchen')!.qty).toBe(2);
    expect(byLabel.get('Modular kitchen')!.unitPrice.amount).toBe(120000);
    expect(byLabel.get('Modular kitchen')!.unitPrice.currency).toBe('INR');
  });

  it('REPLACES line items on update — save 2, then save same id with 3 different → exactly the new 3', async () => {
    const id = randomUUID();
    await repo.save(
      makeQuotation({
        id,
        lineItems: [
          lineItem({ label: 'Old A', qty: 1, unitPrice: 100 }),
          lineItem({ label: 'Old B', qty: 1, unitPrice: 200 }),
        ],
      }),
    );

    await repo.save(
      makeQuotation({
        id,
        lineItems: [
          lineItem({ label: 'New A', qty: 3, unitPrice: 10 }),
          lineItem({ label: 'New B', qty: 4, unitPrice: 20 }),
          lineItem({ label: 'New C', qty: 5, unitPrice: 30 }),
        ],
      }),
    );

    const found = await repo.findById(id);
    expect(found!.lineItems).toHaveLength(3);
    expect(found!.lineItems.map((li) => li.label).sort()).toEqual(['New A', 'New B', 'New C']);
    // 3*10 + 4*20 + 5*30 = 30 + 80 + 150 = 260
    expect(found!.total).toBe(260);

    // no orphaned/duplicated rows remain in the child table
    const rowCount = await prisma.quoteLineItem.count();
    expect(rowCount).toBe(3);
  });

  it('enforces the REAL unique idempotency_key constraint (two different ids, same key → P2002)', async () => {
    const key = `idem-${randomUUID()}`;
    await repo.save(makeQuotation({ idempotencyKey: key }));

    await expect(
      repo.save(makeQuotation({ idempotencyKey: key })),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('list() paginates and countByStatus() reports the byStatus map + total', async () => {
    const statuses: QuotationStatus[] = ['requested', 'requested', 'reviewing', 'quoted', 'won'];
    for (const status of statuses) {
      await repo.save(makeQuotation({ status }));
    }

    const page1 = await repo.list({ page: 1, limit: 2 });
    expect(page1.total).toBe(5);
    expect(page1.items).toHaveLength(2);

    const page2 = await repo.list({ page: 2, limit: 2 });
    expect(page2.total).toBe(5);
    expect(page2.items).toHaveLength(2);

    const page3 = await repo.list({ page: 3, limit: 2 });
    expect(page3.items).toHaveLength(1);

    const requestedOnly = await repo.list({ page: 1, limit: 10, status: 'requested' });
    expect(requestedOnly.total).toBe(2);
    expect(requestedOnly.items.every((i) => i.status === 'requested')).toBe(true);

    const counts = await repo.countByStatus();
    expect(counts.total).toBe(5);
    expect(counts.byStatus).toEqual({ requested: 2, reviewing: 1, quoted: 1, won: 1, lost: 0 });
  });

  it('RequestQuotation use-case is idempotent on real DB (mocked EventPublisher): same key → same id, one row, one publish', async () => {
    const events: EventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    const useCase = new RequestQuotation(repo, events);

    const payload: RequestQuotationPayload = {
      contact: { name: 'Ravi Kumar', email: 'ravi@example.com', phone: '+91 98888 77777' },
      serviceSlugs: ['architecture'],
      projectType: 'commercial',
      budgetRange: { min: 100000, max: 500000, currency: 'INR' },
      timeline: '6 months',
      details: 'Office fit-out',
      attachments: [],
      idempotencyKey: `uc-${randomUUID()}`,
      correlationId: 'corr-1',
    };

    const first = await useCase.execute(payload);
    expect(first.ok).toBe(true);
    const firstId = (first as { ok: true; data: { id: string } }).data.id;
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(await prisma.quotationRequest.count()).toBe(1);

    const second = await useCase.execute(payload);
    expect(second.ok).toBe(true);
    const secondId = (second as { ok: true; data: { id: string } }).data.id;

    expect(secondId).toBe(firstId);
    expect(await prisma.quotationRequest.count()).toBe(1); // no duplicate row
    expect(events.publish).toHaveBeenCalledTimes(1); // NOT called again
  });
});
