/**
 * Integration — PrismaAssetRepository against the REAL native Postgres (media_db_test).
 * Proves the Prisma schema ↔ domain mapping (incl. variants JSON), the markReady() transition
 * persistence, findManyByIds partial matching, and that save() is an idempotent upsert.
 */
import { randomUUID } from 'node:crypto';
import type { AssetStatus, OwnerContext } from '@fardeen/types';
import { Asset, type AssetProps } from '../../domain/entities/asset.entity';
import { testDbUrl, truncate } from '../../../../../test/integration/support';
import { PrismaService } from './prisma.service';
import { PrismaAssetRepository } from './asset.repository.impl';

function makeAsset(over: Partial<AssetProps> = {}): Asset {
  const props: AssetProps = {
    id: randomUUID(),
    bucket: 'media',
    objectKey: `uploads/${randomUUID()}.jpg`,
    mime: 'image/jpeg',
    size: 1024,
    checksum: 'sha256:deadbeef',
    ownerContext: 'project' as OwnerContext,
    ownerId: null,
    variants: [],
    status: 'pending' as AssetStatus,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  };
  return Asset.create(props);
}

describe('PrismaAssetRepository (integration · real Postgres media_db_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaAssetRepository;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('media_db_test'));
    await prisma.$connect();
    repo = new PrismaAssetRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), ['assets']);
  });

  it('round-trips an asset and reconstructs the domain aggregate faithfully', async () => {
    const a = makeAsset({
      bucket: 'media',
      objectKey: 'uploads/skyline.jpg',
      mime: 'image/jpeg',
      size: 204800,
      checksum: 'sha256:abc123',
      ownerContext: 'cms' as OwnerContext,
      ownerId: 'cms-entry-1',
      status: 'ready' as AssetStatus,
      variants: [
        { kind: 'thumb', objectKey: 'uploads/skyline.thumb.webp' },
        { kind: 'avif', objectKey: 'uploads/skyline.avif' },
      ],
    });
    await repo.save(a);

    const found = await repo.findById(a.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(a.id);
    expect(found!.bucket).toBe('media');
    expect(found!.objectKey).toBe('uploads/skyline.jpg');
    expect(found!.mime).toBe('image/jpeg');
    expect(found!.size).toBe(204800);
    expect(found!.checksum).toBe('sha256:abc123');
    expect(found!.ownerContext).toBe('cms');
    expect(found!.ownerId).toBe('cms-entry-1');
    expect(found!.status).toBe('ready');
    expect(found!.variants).toEqual([
      { kind: 'thumb', objectKey: 'uploads/skyline.thumb.webp' },
      { kind: 'avif', objectKey: 'uploads/skyline.avif' },
    ]);
    expect(found!.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns null for a missing id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });

  it('persists the pending → ready transition across a re-save', async () => {
    const a = makeAsset({ status: 'pending' as AssetStatus });
    await repo.save(a);

    // sanity: stored as pending first
    const pending = await repo.findById(a.id);
    expect(pending!.status).toBe('pending');

    // domain transition, then re-save
    expect(a.markReady()).toBe(true);
    await repo.save(a);

    const reloaded = await repo.findById(a.id);
    expect(reloaded!.status).toBe('ready');

    // confirm the transition landed in the DB column, not just the domain object
    const row = await prisma.asset.findUnique({ where: { id: a.id } });
    expect(row!.status).toBe('ready');
  });

  it('findManyByIds returns only the existing ids (missing omitted, duplicates collapse)', async () => {
    const a1 = makeAsset();
    const a2 = makeAsset();
    const a3 = makeAsset();
    await repo.save(a1);
    await repo.save(a2);
    await repo.save(a3);
    const missingId = randomUUID();

    const found = await repo.findManyByIds([a1.id, a3.id, missingId]);
    expect(found).toHaveLength(2);
    expect(found.map((x) => x.id).sort()).toEqual([a1.id, a3.id].sort());

    // duplicate ids collapse via `where: { id: { in } }`
    const deduped = await repo.findManyByIds([a1.id, a1.id, a1.id]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe(a1.id);

    // empty input yields empty result
    expect(await repo.findManyByIds([])).toEqual([]);
  });

  it('save() is an upsert — re-saving the same id updates in place without duplicating', async () => {
    const a = makeAsset({ status: 'pending' as AssetStatus, size: 100, checksum: 'sha256:v1' });
    await repo.save(a);
    expect(await prisma.asset.count()).toBe(1);

    // mutate + re-save with the SAME id
    a.markReady();
    const updated = makeAsset({
      id: a.id,
      status: 'ready' as AssetStatus,
      size: 999,
      checksum: 'sha256:v2',
      objectKey: a.objectKey,
      createdAt: a.createdAt,
    });
    await repo.save(updated);

    expect(await prisma.asset.count()).toBe(1);
    const reloaded = await repo.findById(a.id);
    expect(reloaded!.status).toBe('ready');
    expect(reloaded!.size).toBe(999);
    expect(reloaded!.checksum).toBe('sha256:v2');
  });
});
