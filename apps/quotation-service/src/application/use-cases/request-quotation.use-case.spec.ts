import { EVENTS, type RequestQuotationPayload } from '@fardeen/types';
import { QuotationRequest } from '../../domain/entities/quotation-request.entity';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import { QuoteContact } from '../../domain/value-objects/quote-contact.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { RequestQuotation } from './request-quotation.use-case';

// Deterministic id generation — the use-case calls randomUUID() directly (no injectable id-gen).
jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomUUID: jest.fn(() => 'fixed-uuid-1111'),
}));

function makeRepo(): jest.Mocked<QuotationRepository> {
  return {
    findByIdempotencyKey: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    list: jest.fn(),
    countByStatus: jest.fn(),
  };
}

function makeEvents(): jest.Mocked<EventPublisher> {
  return { publish: jest.fn() };
}

const payload: RequestQuotationPayload = {
  contact: { name: 'Ada', email: 'ada@example.com', phone: '+15551234567' },
  serviceSlugs: ['seo'],
  projectType: 'web',
  budgetRange: { min: 1000, max: 5000, currency: 'INR' },
  timeline: '4w',
  details: 'Need a site',
  attachments: [],
  idempotencyKey: 'idem-abc',
  correlationId: 'corr-1',
};

describe('RequestQuotation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Deterministic clock for createdAt.
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates + saves a new request and emits quotation.requested', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findByIdempotencyKey.mockResolvedValue(null);

    const result = await new RequestQuotation(repo, events).execute(payload);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.id).toBe('fixed-uuid-1111');
    expect(result.data.status).toBe('requested');
    expect(result.data.contact.email).toBe('ada@example.com');
    expect(result.data.budgetRange).toEqual({ min: 1000, max: 5000, currency: 'INR' });

    // saved exactly once with the created aggregate
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved).toBeInstanceOf(QuotationRequest);
    expect(saved.id).toBe('fixed-uuid-1111');
    expect(saved.status).toBe('requested');

    // emitted exactly once with the right event name + data
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith({
      name: EVENTS.quotationRequested,
      correlationId: 'corr-1',
      data: { quotationId: 'fixed-uuid-1111', email: 'ada@example.com' },
    });
    expect(EVENTS.quotationRequested).toBe('quotation.requested');
  });

  it('is idempotent: an existing key returns the existing request WITHOUT saving or emitting', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const existing = QuotationRequest.rehydrate({
      id: 'existing-id',
      contact: QuoteContact.create(payload.contact),
      serviceSlugs: [],
      projectType: 'web',
      budgetRange: null,
      timeline: '',
      details: '',
      attachments: [],
      status: 'reviewing',
      lineItems: [],
      idempotencyKey: payload.idempotencyKey,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    repo.findByIdempotencyKey.mockResolvedValue(existing);

    const result = await new RequestQuotation(repo, events).execute(payload);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.id).toBe('existing-id');
    expect(result.data.status).toBe('reviewing');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('returns an error Result (VALIDATION_ERROR) on an invalid contact — no save/emit', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findByIdempotencyKey.mockResolvedValue(null);

    const result = await new RequestQuotation(repo, events).execute({
      ...payload,
      contact: { name: 'Ada', email: 'bad-email', phone: '+15551234567' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('creates with a null budgetRange when none is supplied', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findByIdempotencyKey.mockResolvedValue(null);

    const result = await new RequestQuotation(repo, events).execute({
      ...payload,
      budgetRange: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.budgetRange).toBeNull();
  });
});
