import { DomainError } from '@fardeen/shared';
import { EVENTS } from '@fardeen/types';
import type { AssetProps } from '../../domain/entities/asset.entity';
import { Asset } from '../../domain/entities/asset.entity';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import type { EventPublisher } from '../ports/event-publisher.port';
import type { MediaStore } from '../ports/media-store.port';
import { GetAsset } from './get-asset.use-case';

const buildAsset = (over: Partial<AssetProps> = {}): Asset =>
  Asset.create({
    id: 'asset-1',
    bucket: 'media',
    objectKey: 'cms/asset-1/pic.png',
    mime: 'image/png',
    size: 10,
    checksum: 'chk',
    ownerContext: 'cms',
    ownerId: null,
    variants: [{ kind: 'thumb', objectKey: 'cms/asset-1/thumb.png' }],
    status: 'pending',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  });

const makeMocks = () => {
  const repo: jest.Mocked<AssetRepository> = {
    findById: jest.fn(),
    findManyByIds: jest.fn(),
    save: jest.fn(),
  };
  const store: jest.Mocked<MediaStore> = {
    bucket: 'media',
    presignPut: jest.fn(),
    presignGet: jest.fn(),
    exists: jest.fn(),
  };
  const events: jest.Mocked<EventPublisher> = { publish: jest.fn() };
  return { repo, store, events };
};

describe('GetAsset', () => {
  it('returns ASSET_NOT_FOUND when the repo has no asset', async () => {
    const { repo, store, events } = makeMocks();
    repo.findById.mockResolvedValue(null);

    const res = await new GetAsset(repo, store, events).execute({ id: 'missing' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('ASSET_NOT_FOUND');
    expect(store.presignGet).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lazily confirms a pending asset: marks ready, saves, publishes media.uploaded once, returns resolved', async () => {
    const { repo, store, events } = makeMocks();
    const asset = buildAsset({ status: 'pending' });
    repo.findById.mockResolvedValue(asset);
    store.exists.mockResolvedValue(true);
    store.presignGet.mockImplementation(async (key: string) => `signed:${key}`);

    const res = await new GetAsset(repo, store, events).execute({ id: 'asset-1' });

    expect(asset.status).toBe('ready');
    expect(repo.save).toHaveBeenCalledWith(asset);
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith({
      name: EVENTS.mediaUploaded,
      data: { assetId: 'asset-1', ownerContext: 'cms', objectKey: 'cms/asset-1/pic.png' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({
        id: 'asset-1',
        url: 'signed:cms/asset-1/pic.png',
        status: 'ready',
        mime: 'image/png',
        variants: [{ kind: 'thumb', url: 'signed:cms/asset-1/thumb.png' }],
      });
    }
  });

  it('does not save/publish when the object does not exist yet', async () => {
    const { repo, store, events } = makeMocks();
    const asset = buildAsset({ status: 'pending' });
    repo.findById.mockResolvedValue(asset);
    store.exists.mockResolvedValue(false);
    store.presignGet.mockResolvedValue('signed');

    const res = await new GetAsset(repo, store, events).execute({ id: 'asset-1' });

    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(asset.status).toBe('pending');
    expect(res.ok).toBe(true);
  });

  it('does not re-save/re-publish an already-ready asset even if the object exists', async () => {
    const { repo, store, events } = makeMocks();
    const asset = buildAsset({ status: 'ready' });
    repo.findById.mockResolvedValue(asset);
    store.exists.mockResolvedValue(true);
    store.presignGet.mockResolvedValue('signed');

    const res = await new GetAsset(repo, store, events).execute({ id: 'asset-1' });

    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it('maps a thrown DomainError to the Result error envelope', async () => {
    const { repo, store, events } = makeMocks();
    repo.findById.mockRejectedValue(new DomainError('BOOM', 'boom happened'));

    const res = await new GetAsset(repo, store, events).execute({ id: 'asset-1' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('BOOM');
  });

  it('rethrows unexpected (non-domain) errors', async () => {
    const { repo, store, events } = makeMocks();
    repo.findById.mockRejectedValue(new Error('infra down'));

    await expect(new GetAsset(repo, store, events).execute({ id: 'asset-1' })).rejects.toThrow('infra down');
  });
});
