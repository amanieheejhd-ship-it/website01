import { GetServiceBySlug } from './get-service-by-slug.use-case';
import { ServiceOffering } from '../../domain/entities/service-offering.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import type { ServiceRepository } from '../../domain/repositories/service.repository';

function makeRepo(): jest.Mocked<ServiceRepository> {
  return {
    listActive: jest.fn(),
    listAll: jest.fn(),
    findBySlug: jest.fn(),
    upsertBySlug: jest.fn(),
  };
}

function offering(slug: string): ServiceOffering {
  return ServiceOffering.create({
    id: 'id-1',
    slug: Slug.create(slug),
    name: 'Name',
    tagline: '',
    description: '',
    icon: '',
    heroMediaId: null,
    order: 0,
    active: true,
    features: [],
    pricingTiers: [{ id: 'p', name: 'T', priceFrom: Money.of(500), unit: 'u', inclusions: [] }],
  });
}

describe('GetServiceBySlug use-case', () => {
  it('returns the DTO when the offering is found (querying by normalized slug)', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(offering('portrait-session'));

    const res = await new GetServiceBySlug(repo).execute({ slug: 'Portrait Session' });

    expect(repo.findBySlug).toHaveBeenCalledTimes(1);
    expect(repo.findBySlug.mock.calls[0][0]).toBeInstanceOf(Slug);
    expect(repo.findBySlug.mock.calls[0][0].value).toBe('portrait-session');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.slug).toBe('portrait-session');
    expect(res.data.pricingTiers[0].priceFrom).toBe(500);
  });

  it('returns a SERVICE_NOT_FOUND error when the offering is absent', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(null);

    const res = await new GetServiceBySlug(repo).execute({ slug: 'missing' });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('SERVICE_NOT_FOUND');
  });

  it('returns a VALIDATION_ERROR when the slug is invalid (no repository hit)', async () => {
    const repo = makeRepo();
    const res = await new GetServiceBySlug(repo).execute({ slug: '!!!' });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.findBySlug).not.toHaveBeenCalled();
  });

  it('rethrows unexpected (non-domain) repository failures', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockRejectedValue(new Error('db down'));
    await expect(new GetServiceBySlug(repo).execute({ slug: 'x' })).rejects.toThrow('db down');
  });
});
