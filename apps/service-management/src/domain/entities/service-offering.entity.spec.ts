import { ServiceOffering, type ServiceOfferingProps } from './service-offering.entity';
import { Money } from '../value-objects/money.vo';
import { Slug } from '../value-objects/slug.vo';
import { SERVICE_REPOSITORY } from '../repositories/service.repository';

function buildProps(overrides: Partial<ServiceOfferingProps> = {}): ServiceOfferingProps {
  return {
    id: 'svc-1',
    slug: Slug.create('wedding-photography'),
    name: 'Wedding Photography',
    tagline: 'Frames that last',
    description: 'Full-day coverage',
    icon: 'camera',
    heroMediaId: 'media-9',
    order: 2,
    active: true,
    features: [{ id: 'f1', title: 'Two shooters', description: 'A + B', order: 0 }],
    pricingTiers: [
      { id: 'p1', name: 'Basic', priceFrom: Money.of(50000), unit: 'event', inclusions: ['200 photos'] },
    ],
    ...overrides,
  };
}

describe('ServiceOffering entity', () => {
  it('exports a repository injection token symbol', () => {
    expect(typeof SERVICE_REPOSITORY).toBe('symbol');
  });

  it('create() exposes every prop through its getters', () => {
    const props = buildProps();
    const o = ServiceOffering.create(props);
    expect(o.id).toBe('svc-1');
    expect(o.slug).toBe(props.slug);
    expect(o.slug.value).toBe('wedding-photography');
    expect(o.name).toBe('Wedding Photography');
    expect(o.tagline).toBe('Frames that last');
    expect(o.description).toBe('Full-day coverage');
    expect(o.icon).toBe('camera');
    expect(o.heroMediaId).toBe('media-9');
    expect(o.order).toBe(2);
    expect(o.active).toBe(true);
  });

  it('rehydrate() reconstructs an offering identically to create()', () => {
    const props = buildProps({ active: false, heroMediaId: null });
    const o = ServiceOffering.rehydrate(props);
    expect(o.active).toBe(false);
    expect(o.heroMediaId).toBeNull();
  });

  it('exposes features with their ordering metadata', () => {
    const o = ServiceOffering.create(buildProps());
    expect(o.features).toHaveLength(1);
    expect(o.features[0]).toMatchObject({ id: 'f1', title: 'Two shooters', order: 0 });
  });

  it('exposes pricing tiers carrying Money value objects', () => {
    const o = ServiceOffering.create(buildProps());
    expect(o.pricingTiers).toHaveLength(1);
    expect(o.pricingTiers[0].priceFrom).toBeInstanceOf(Money);
    expect(o.pricingTiers[0].priceFrom.amount).toBe(50000);
    expect(o.pricingTiers[0].priceFrom.currency).toBe('INR');
    expect(o.pricingTiers[0].inclusions).toEqual(['200 photos']);
  });
});
