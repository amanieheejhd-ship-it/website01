jest.mock('node:crypto', () => ({ randomUUID: jest.fn() }));

import { randomUUID } from 'node:crypto';
import type { UpsertServicePayload } from '@fardeen/types';
import { UpsertService } from './upsert-service.use-case';
import { ServiceOffering } from '../../domain/entities/service-offering.entity';
import type { ServiceRepository } from '../../domain/repositories/service.repository';

const uuid = randomUUID as jest.Mock;

function makeRepo(): jest.Mocked<ServiceRepository> {
  return {
    listActive: jest.fn(),
    listAll: jest.fn(),
    findBySlug: jest.fn(),
    upsertBySlug: jest.fn().mockResolvedValue(undefined),
  };
}

function payload(overrides: Partial<UpsertServicePayload> = {}): UpsertServicePayload {
  return {
    slug: 'Event Planning',
    name: 'Event Planning',
    tagline: 'We plan',
    description: 'Turnkey events',
    icon: 'calendar',
    order: 1,
    active: true,
    features: [{ title: 'Vendor mgmt', description: 'All vendors', order: 0 }],
    pricingTiers: [
      { name: 'Standard', priceFrom: 25000, currency: 'INR', unit: 'event', inclusions: ['coordinator'] },
    ],
    ...overrides,
  } as UpsertServicePayload;
}

describe('UpsertService use-case', () => {
  beforeEach(() => {
    let n = 0;
    uuid.mockReset();
    uuid.mockImplementation(() => `uuid-${++n}`);
  });

  it('builds a normalized offering and persists it via upsertBySlug', async () => {
    const repo = makeRepo();
    const res = await new UpsertService(repo).execute(payload());

    expect(res.ok).toBe(true);
    expect(repo.upsertBySlug).toHaveBeenCalledTimes(1);

    const saved = repo.upsertBySlug.mock.calls[0][0];
    expect(saved).toBeInstanceOf(ServiceOffering);
    // slug is normalized by the Slug VO
    expect(saved.slug.value).toBe('event-planning');
    expect(saved.name).toBe('Event Planning');
    expect(saved.id).toBe('uuid-1');
    expect(saved.heroMediaId).toBeNull(); // omitted -> null
    // generated ids for nested collections
    expect(saved.features[0]).toMatchObject({ id: 'uuid-2', title: 'Vendor mgmt', order: 0 });
    expect(saved.pricingTiers[0].id).toBe('uuid-3');
    expect(saved.pricingTiers[0].priceFrom.amount).toBe(25000);
    expect(saved.pricingTiers[0].priceFrom.currency).toBe('INR');
  });

  it('returns a DTO mirroring the persisted offering', async () => {
    const repo = makeRepo();
    const res = await new UpsertService(repo).execute(payload({ heroMediaId: 'media-1' }));

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatchObject({
      id: 'uuid-1',
      slug: 'event-planning',
      heroMediaId: 'media-1',
      features: [{ id: 'uuid-2', title: 'Vendor mgmt' }],
      pricingTiers: [{ id: 'uuid-3', priceFrom: 25000, currency: 'INR' }],
    });
  });

  it('passes an existing slug straight through so the repo upserts (update path)', async () => {
    const repo = makeRepo();
    await new UpsertService(repo).execute(payload({ slug: 'event-planning' }));
    expect(repo.upsertBySlug.mock.calls[0][0].slug.value).toBe('event-planning');
  });

  it('returns a VALIDATION_ERROR result when the slug is invalid (no persistence)', async () => {
    const repo = makeRepo();
    const res = await new UpsertService(repo).execute(payload({ slug: '   ' }));

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.upsertBySlug).not.toHaveBeenCalled();
  });

  it('returns a VALIDATION_ERROR result when a pricing amount is negative', async () => {
    const repo = makeRepo();
    const res = await new UpsertService(repo).execute(
      payload({
        pricingTiers: [
          { name: 'Bad', priceFrom: -5, currency: 'INR', unit: 'event', inclusions: [] },
        ],
      }),
    );

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.upsertBySlug).not.toHaveBeenCalled();
  });

  it('rethrows unexpected (non-domain) repository failures', async () => {
    const repo = makeRepo();
    repo.upsertBySlug.mockRejectedValue(new Error('db down'));
    await expect(new UpsertService(repo).execute(payload())).rejects.toThrow('db down');
  });
});
