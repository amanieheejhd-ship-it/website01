import type { AssetProps } from '../../domain/entities/asset.entity';
import { Asset } from '../../domain/entities/asset.entity';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import type { MediaStore } from '../ports/media-store.port';
import { ResolveMany } from './resolve-many.use-case';

const buildAsset = (over: Partial<AssetProps> = {}): Asset =>
  Asset.create({
    id: 'a1',
    bucket: 'media',
    objectKey: 'cms/a1/pic.png',
    mime: 'image/png',
    size: 10,
    checksum: 'chk',
    ownerContext: 'cms',
    ownerId: null,
    variants: [],
    status: 'ready',
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
  return { repo, store };
};

describe('ResolveMany', () => {
  it('returns an empty map for an empty id list without hitting the repo', async () => {
    const { repo, store } = makeMocks();

    const res = await new ResolveMany(repo, store).execute({ ids: [] });

    expect(repo.findManyByIds).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual({});
  });

  it('de-duplicates repeated ids (and drops falsy ones) before querying the repo', async () => {
    const { repo, store } = makeMocks();
    repo.findManyByIds.mockResolvedValue([]);

    await new ResolveMany(repo, store).execute({
      ids: ['a1', 'a1', 'a2', '', 'a2'],
    });

    expect(repo.findManyByIds).toHaveBeenCalledTimes(1);
    expect(repo.findManyByIds).toHaveBeenCalledWith(['a1', 'a2']);
  });

  it('omits missing ids and keys the result by resolved asset id', async () => {
    const { repo, store } = makeMocks();
    const a1 = buildAsset({ id: 'a1', objectKey: 'cms/a1/pic.png', variants: [{ kind: 'thumb', objectKey: 'cms/a1/thumb.png' }] });
    // Only a1 comes back; a2 is missing and must be omitted.
    repo.findManyByIds.mockResolvedValue([a1]);
    store.presignGet.mockImplementation(async (key: string) => `signed:${key}`);

    const res = await new ResolveMany(repo, store).execute({ ids: ['a1', 'a2'] });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(Object.keys(res.data)).toEqual(['a1']);
      expect(res.data['a2']).toBeUndefined();
      expect(res.data['a1']).toEqual({
        id: 'a1',
        url: 'signed:cms/a1/pic.png',
        status: 'ready',
        mime: 'image/png',
        variants: [{ kind: 'thumb', url: 'signed:cms/a1/thumb.png' }],
      });
    }
  });
});
