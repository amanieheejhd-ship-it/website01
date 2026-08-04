import { ValidationError } from '@fardeen/shared';
import type { QuotationStatus } from '@fardeen/types';
import { Money } from '../value-objects/money.vo';
import { QuoteContact } from '../value-objects/quote-contact.vo';
import { type QuoteLineItem, QuotationRequest } from './quotation-request.entity';

const contact = QuoteContact.create({ name: 'Ada', email: 'ada@example.com', phone: '+15551234567' });

function build(status: QuotationStatus, lineItems: QuoteLineItem[] = []): QuotationRequest {
  return QuotationRequest.create({
    id: 'q1',
    contact,
    serviceSlugs: [],
    projectType: 'web',
    budgetRange: null,
    timeline: '',
    details: '',
    attachments: [],
    status,
    lineItems,
    idempotencyKey: 'idem-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('QuotationRequest status lifecycle', () => {
  const validTransitions: Array<[QuotationStatus, QuotationStatus]> = [
    ['requested', 'reviewing'],
    ['requested', 'lost'],
    ['reviewing', 'quoted'],
    ['reviewing', 'lost'],
    ['quoted', 'won'],
    ['quoted', 'lost'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    const q = build(from);
    const result = q.changeStatus(to);
    expect(result).toEqual({ from, to });
    expect(q.status).toBe(to);
  });

  const invalidTransitions: Array<[QuotationStatus, QuotationStatus]> = [
    ['requested', 'quoted'],
    ['requested', 'won'],
    ['reviewing', 'won'],
    ['reviewing', 'requested'],
    ['quoted', 'reviewing'],
    ['quoted', 'requested'],
    ['won', 'lost'],
    ['won', 'reviewing'],
    ['lost', 'won'],
    ['lost', 'reviewing'],
  ];

  it.each(invalidTransitions)('rejects %s → %s', (from, to) => {
    const q = build(from);
    expect(() => q.changeStatus(to)).toThrow(ValidationError);
    expect(q.status).toBe(from); // unchanged
  });

  it('treats same-status as a no-op (returns from===to, does not throw)', () => {
    const q = build('reviewing');
    const result = q.changeStatus('reviewing');
    expect(result).toEqual({ from: 'reviewing', to: 'reviewing' });
    expect(q.status).toBe('reviewing');
  });

  it('same-status no-op holds even for terminal states', () => {
    const q = build('won');
    expect(q.changeStatus('won')).toEqual({ from: 'won', to: 'won' });
  });
});

describe('QuotationRequest.total', () => {
  it('is 0 when there are no line items', () => {
    expect(build('requested').total).toBe(0);
  });

  it('sums qty × unitPrice.amount across line items', () => {
    const items: QuoteLineItem[] = [
      { id: 'l1', label: 'Design', qty: 2, unitPrice: Money.of(1500) },
      { id: 'l2', label: 'Dev', qty: 3, unitPrice: Money.of(1000) },
    ];
    // 2*1500 + 3*1000 = 6000
    expect(build('requested', items).total).toBe(6000);
  });
});

describe('QuotationRequest accessors + rehydrate', () => {
  it('exposes props via getters', () => {
    const item: QuoteLineItem = { id: 'l1', label: 'X', qty: 1, unitPrice: Money.of(500) };
    const q = QuotationRequest.rehydrate({
      id: 'q9',
      contact,
      serviceSlugs: ['seo', 'ppc'],
      projectType: 'marketing',
      budgetRange: null,
      timeline: '2w',
      details: 'details here',
      attachments: ['m1'],
      status: 'quoted',
      lineItems: [item],
      idempotencyKey: 'k-9',
      createdAt: new Date('2026-02-02T00:00:00.000Z'),
    });
    expect(q.id).toBe('q9');
    expect(q.contact).toBe(contact);
    expect(q.serviceSlugs).toEqual(['seo', 'ppc']);
    expect(q.projectType).toBe('marketing');
    expect(q.budgetRange).toBeNull();
    expect(q.timeline).toBe('2w');
    expect(q.details).toBe('details here');
    expect(q.attachments).toEqual(['m1']);
    expect(q.status).toBe('quoted');
    expect(q.lineItems).toEqual([item]);
    expect(q.idempotencyKey).toBe('k-9');
    expect(q.createdAt).toEqual(new Date('2026-02-02T00:00:00.000Z'));
  });
});
