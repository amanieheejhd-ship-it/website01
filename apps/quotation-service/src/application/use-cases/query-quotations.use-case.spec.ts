import type { QuotationStatus } from '@fardeen/types';
import { QuotationRequest } from '../../domain/entities/quotation-request.entity';
import type { QuotationRepository } from '../../domain/repositories/quotation.repository';
import { QuoteContact } from '../../domain/value-objects/quote-contact.vo';
import { GetQuotation } from './get-quotation.use-case';
import { GetQuotationStats } from './get-quotation-stats.use-case';
import { ListQuotations } from './list-quotations.use-case';

function makeRepo(): jest.Mocked<QuotationRepository> {
  return {
    findByIdempotencyKey: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    list: jest.fn(),
    countByStatus: jest.fn(),
  };
}

const contact = QuoteContact.create({ name: 'Ada', email: 'ada@example.com', phone: '+15551234567' });

function quotation(id: string, status: QuotationStatus = 'requested'): QuotationRequest {
  return QuotationRequest.rehydrate({
    id,
    contact,
    serviceSlugs: [],
    projectType: 'web',
    budgetRange: null,
    timeline: '',
    details: '',
    attachments: [],
    status,
    lineItems: [],
    idempotencyKey: `idem-${id}`,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('GetQuotation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the mapped DTO when found', async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(quotation('q1', 'quoted'));

    const result = await new GetQuotation(repo).execute({ id: 'q1' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.id).toBe('q1');
    expect(result.data.status).toBe('quoted');
  });

  it('returns QUOTATION_NOT_FOUND when missing', async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);

    const result = await new GetQuotation(repo).execute({ id: 'nope' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.code).toBe('QUOTATION_NOT_FOUND');
  });
});

describe('ListQuotations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps items and passes through the supplied paging + status filter', async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue({ items: [quotation('a'), quotation('b')], total: 2 });

    const result = await new ListQuotations(repo).execute({ status: 'reviewing', page: 2, limit: 5 });

    expect(repo.list).toHaveBeenCalledWith({ status: 'reviewing', page: 2, limit: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.data.page).toBe(2);
    expect(result.data.limit).toBe(5);
    expect(result.data.total).toBe(2);
  });

  it('defaults page=1 and limit=20 when omitted', async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue({ items: [], total: 0 });

    const result = await new ListQuotations(repo).execute({});

    expect(repo.list).toHaveBeenCalledWith({ status: undefined, page: 1, limit: 20 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(20);
  });
});

describe('GetQuotationStats', () => {
  it('returns the repository counts wrapped in ok()', async () => {
    const repo = makeRepo();
    const stats = {
      byStatus: { requested: 3, reviewing: 1, quoted: 2, won: 1, lost: 0 },
      total: 7,
    };
    repo.countByStatus.mockResolvedValue(stats);

    const result = await new GetQuotationStats(repo).execute();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.data).toEqual(stats);
  });
});
