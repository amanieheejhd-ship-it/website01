import { ListServices } from './list-services.use-case';
import { ListAllServices } from './list-all-services.use-case';
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

function offering(slug: string, active: boolean): ServiceOffering {
  return ServiceOffering.create({
    id: `id-${slug}`,
    slug: Slug.create(slug),
    name: slug,
    tagline: '',
    description: '',
    icon: '',
    heroMediaId: null,
    order: 0,
    active,
    features: [],
    pricingTiers: [
      { id: 'p', name: 'T', priceFrom: Money.of(100), unit: 'u', inclusions: [] },
    ],
  });
}

describe('ListServices use-case (public, active-only)', () => {
  it('returns DTOs only for active offerings from listActive()', async () => {
    const repo = makeRepo();
    repo.listActive.mockResolvedValue([offering('a', true), offering('b', true)]);

    const res = await new ListServices(repo).execute();

    expect(repo.listActive).toHaveBeenCalledTimes(1);
    expect(repo.listAll).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.map((d) => d.slug)).toEqual(['a', 'b']);
    expect(res.data[0].pricingTiers[0].priceFrom).toBe(100);
  });

  it('returns an empty list when there are no active offerings', async () => {
    const repo = makeRepo();
    repo.listActive.mockResolvedValue([]);
    const res = await new ListServices(repo).execute();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual([]);
  });
});

describe('ListAllServices use-case (admin, incl inactive)', () => {
  it('returns DTOs for every offering from listAll()', async () => {
    const repo = makeRepo();
    repo.listAll.mockResolvedValue([offering('a', true), offering('c', false)]);

    const res = await new ListAllServices(repo).execute();

    expect(repo.listAll).toHaveBeenCalledTimes(1);
    expect(repo.listActive).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.map((d) => d.slug)).toEqual(['a', 'c']);
    expect(res.data.map((d) => d.active)).toEqual([true, false]);
  });
});
