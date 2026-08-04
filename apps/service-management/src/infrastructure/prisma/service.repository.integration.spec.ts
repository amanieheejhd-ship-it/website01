/**
 * Integration — PrismaServiceRepository against the REAL native Postgres (service_db_test).
 * Proves the Prisma schema ↔ domain mapping for the ServiceOffering aggregate, including the
 * nested Feature[] + PricingTier[] persistence (create + replace-on-upsert), the active/all list
 * filters, and the create-or-update-by-slug (upsert) semantics.
 */
import { randomUUID } from 'node:crypto';
import {
  ServiceOffering,
  type Feature,
  type PricingTier,
  type ServiceOfferingProps,
} from '../../domain/entities/service-offering.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { testDbUrl, truncate } from '../../../../../test/integration/support';
import { PrismaService } from './prisma.service';
import { PrismaServiceRepository } from './service.repository.impl';

function feature(over: Partial<Feature> = {}): Feature {
  return {
    id: randomUUID(),
    title: 'A Feature',
    description: 'feature description',
    order: 0,
    ...over,
  };
}

function tier(over: Partial<PricingTier> = {}): PricingTier {
  return {
    id: randomUUID(),
    name: 'Standard',
    priceFrom: Money.of(150000, 'INR'),
    unit: 'per sq ft',
    inclusions: ['design', 'consultation'],
    ...over,
  };
}

function makeOffering(
  over: Partial<ServiceOfferingProps> & { slug: string },
): ServiceOffering {
  const props: ServiceOfferingProps = {
    id: randomUUID(),
    name: 'A Service',
    tagline: 'tagline',
    description: 'description',
    icon: 'icon-name',
    heroMediaId: null,
    order: 0,
    active: true,
    features: [],
    pricingTiers: [],
    ...over,
    slug: Slug.create(over.slug),
  };
  return ServiceOffering.create(props);
}

describe('PrismaServiceRepository (integration · real Postgres service_db_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaServiceRepository;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('service_db_test'));
    await prisma.$connect();
    repo = new PrismaServiceRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), [
      'pricing_tiers',
      'features',
      'service_offerings',
    ]);
  });

  it('round-trips an offering with nested features + pricing tiers faithfully', async () => {
    const offering = makeOffering({
      slug: 'interior-design',
      name: 'Interior Design',
      tagline: 'Spaces that inspire',
      heroMediaId: 'med_hero',
      order: 3,
      features: [
        feature({ title: 'Space Planning', description: 'Optimal layouts', order: 0 }),
        feature({ title: '3D Visualization', description: 'Photoreal renders', order: 1 }),
        feature({ title: 'Turnkey Execution', description: 'End to end', order: 2 }),
      ],
      pricingTiers: [
        tier({
          name: 'Essential',
          priceFrom: Money.of(120000, 'INR'),
          unit: 'per room',
          inclusions: ['concept', 'moodboard'],
        }),
        tier({
          name: 'Premium',
          priceFrom: Money.of(350000, 'USD'),
          unit: 'per project',
          inclusions: ['concept', 'moodboard', '3d', 'site visits'],
        }),
      ],
    });
    await repo.upsertBySlug(offering);

    const found = await repo.findBySlug(Slug.create('interior-design'));
    expect(found).not.toBeNull();
    expect(found!.id).toBe(offering.id);
    expect(found!.slug.value).toBe('interior-design');
    expect(found!.name).toBe('Interior Design');
    expect(found!.tagline).toBe('Spaces that inspire');
    expect(found!.heroMediaId).toBe('med_hero');
    expect(found!.order).toBe(3);
    expect(found!.active).toBe(true);

    // Features persist with fields intact, ordered by `order`.
    expect(found!.features).toHaveLength(3);
    expect(found!.features.map((f) => f.title)).toEqual([
      'Space Planning',
      '3D Visualization',
      'Turnkey Execution',
    ]);
    expect(found!.features.map((f) => f.order)).toEqual([0, 1, 2]);

    // Pricing tiers persist with Money VO amounts + currency + inclusions intact.
    const byName = new Map(found!.pricingTiers.map((t) => [t.name, t]));
    expect(found!.pricingTiers).toHaveLength(2);
    const essential = byName.get('Essential')!;
    expect(essential.priceFrom).toBeInstanceOf(Money);
    expect(essential.priceFrom.amount).toBe(120000);
    expect(essential.priceFrom.currency).toBe('INR');
    expect(essential.unit).toBe('per room');
    expect(essential.inclusions).toEqual(['concept', 'moodboard']);
    const premium = byName.get('Premium')!;
    expect(premium.priceFrom.amount).toBe(350000);
    expect(premium.priceFrom.currency).toBe('USD');
    expect(premium.inclusions).toEqual(['concept', 'moodboard', '3d', 'site visits']);
  });

  it('replaces nested features + pricing tiers on re-upsert (no duplicates)', async () => {
    const first = makeOffering({
      slug: 'architecture',
      features: [feature({ title: 'f1', order: 0 }), feature({ title: 'f2', order: 1 })],
      pricingTiers: [tier({ name: 't1' })],
    });
    await repo.upsertBySlug(first);

    expect(await prisma.feature.count()).toBe(2);
    expect(await prisma.pricingTier.count()).toBe(1);

    // Re-upsert the SAME slug with fresh nested rows (3 features / 2 tiers).
    const second = makeOffering({
      slug: 'architecture',
      features: [
        feature({ title: 'a', order: 0 }),
        feature({ title: 'b', order: 1 }),
        feature({ title: 'c', order: 2 }),
      ],
      pricingTiers: [tier({ name: 'x' }), tier({ name: 'y' })],
    });
    await repo.upsertBySlug(second);

    const found = await repo.findBySlug(Slug.create('architecture'));
    expect(found!.features).toHaveLength(3);
    expect(found!.pricingTiers).toHaveLength(2);
    expect(found!.features.map((f) => f.title)).toEqual(['a', 'b', 'c']);

    // Old nested rows are gone — DB-wide counts confirm no orphans/duplicates.
    expect(await prisma.feature.count()).toBe(3);
    expect(await prisma.pricingTier.count()).toBe(2);
    expect(await prisma.serviceOffering.count()).toBe(1);
  });

  it('listActive returns only active offerings; listAll returns all, ordered by order', async () => {
    await repo.upsertBySlug(makeOffering({ slug: 'active-b', name: 'Active B', order: 2, active: true }));
    await repo.upsertBySlug(makeOffering({ slug: 'active-a', name: 'Active A', order: 1, active: true }));
    await repo.upsertBySlug(makeOffering({ slug: 'hidden', name: 'Hidden', order: 3, active: false }));

    const active = await repo.listActive();
    expect(active.map((o) => o.slug.value)).toEqual(['active-a', 'active-b']);
    expect(active.every((o) => o.active)).toBe(true);

    const all = await repo.listAll();
    // ordered by `order` asc → active-a (1), active-b (2), hidden (3)
    expect(all.map((o) => o.slug.value)).toEqual(['active-a', 'active-b', 'hidden']);
  });

  it('upsertBySlug updates in place — re-upserting a slug does not duplicate the row', async () => {
    await repo.upsertBySlug(
      makeOffering({ slug: 'consulting', name: 'Consulting', tagline: 'v1', order: 1 }),
    );
    await repo.upsertBySlug(
      makeOffering({ slug: 'consulting', name: 'Consulting Reworked', tagline: 'v2', order: 5 }),
    );

    expect(await prisma.serviceOffering.count()).toBe(1);

    const found = await repo.findBySlug(Slug.create('consulting'));
    expect(found!.name).toBe('Consulting Reworked');
    expect(found!.tagline).toBe('v2');
    expect(found!.order).toBe(5);
  });
});
