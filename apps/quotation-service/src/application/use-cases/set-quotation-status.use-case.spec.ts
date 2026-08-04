import { EVENTS, type QuotationStatus, type SetQuotationStatusPayload } from '@fardeen/types';
import { QuotationRequest } from '../../domain/entities/quotation-request.entity';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import { QuoteContact } from '../../domain/value-objects/quote-contact.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { SetQuotationStatus } from './set-quotation-status.use-case';

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

const contact = QuoteContact.create({ name: 'Ada', email: 'ada@example.com', phone: '+15551234567' });

function quotation(status: QuotationStatus): QuotationRequest {
  return QuotationRequest.rehydrate({
    id: 'q1',
    contact,
    serviceSlugs: [],
    projectType: 'web',
    budgetRange: null,
    timeline: '',
    details: '',
    attachments: [],
    status,
    lineItems: [],
    idempotencyKey: 'idem-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function payload(status: QuotationStatus): SetQuotationStatusPayload {
  return { id: 'q1', status, correlationId: 'corr-1' };
}

describe('SetQuotationStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a valid transition saves and emits quotation.statusChanged', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findById.mockResolvedValue(quotation('requested'));

    const result = await new SetQuotationStatus(repo, events).execute(payload('reviewing'));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.status).toBe('reviewing');

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save.mock.calls[0][0].status).toBe('reviewing');

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith({
      name: EVENTS.quotationStatusChanged,
      correlationId: 'corr-1',
      data: { quotationId: 'q1', email: 'ada@example.com', from: 'requested', to: 'reviewing' },
    });
    expect(EVENTS.quotationStatusChanged).toBe('quotation.statusChanged');
  });

  it('setting the SAME status saves but emits NO event', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findById.mockResolvedValue(quotation('reviewing'));

    const result = await new SetQuotationStatus(repo, events).execute(payload('reviewing'));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.status).toBe('reviewing');
    expect(repo.save).toHaveBeenCalledTimes(1); // still persisted
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('an INVALID transition returns VALIDATION_ERROR and does NOT save or emit', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findById.mockResolvedValue(quotation('requested'));

    const result = await new SetQuotationStatus(repo, events).execute(payload('won'));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('returns QUOTATION_NOT_FOUND when the id does not exist — no save/emit', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findById.mockResolvedValue(null);

    const result = await new SetQuotationStatus(repo, events).execute(payload('reviewing'));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.code).toBe('QUOTATION_NOT_FOUND');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
