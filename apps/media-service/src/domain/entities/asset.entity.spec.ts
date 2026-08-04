import type { AssetProps } from './asset.entity';
import { Asset } from './asset.entity';

const baseProps = (over: Partial<AssetProps> = {}): AssetProps => ({
  id: 'asset-1',
  bucket: 'media',
  objectKey: 'cms/asset-1/pic.png',
  mime: 'image/png',
  size: 1234,
  checksum: 'abc',
  ownerContext: 'cms',
  ownerId: 'owner-9',
  variants: [{ kind: 'thumb', objectKey: 'cms/asset-1/thumb.png' }],
  status: 'pending',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...over,
});

describe('Asset', () => {
  describe('markReady()', () => {
    it('returns true and transitions pending → ready', () => {
      const asset = Asset.create(baseProps({ status: 'pending' }));
      expect(asset.markReady()).toBe(true);
      expect(asset.status).toBe('ready');
    });

    it('returns false and does not change state when already ready', () => {
      const asset = Asset.create(baseProps({ status: 'ready' }));
      expect(asset.markReady()).toBe(false);
      expect(asset.status).toBe('ready');
    });

    it('is idempotent — a second call returns false', () => {
      const asset = Asset.create(baseProps({ status: 'pending' }));
      expect(asset.markReady()).toBe(true);
      expect(asset.markReady()).toBe(false);
      expect(asset.status).toBe('ready');
    });
  });

  describe('create / rehydrate + getters', () => {
    it('create exposes every prop through its getter', () => {
      const props = baseProps();
      const asset = Asset.create(props);
      expect(asset.id).toBe(props.id);
      expect(asset.bucket).toBe(props.bucket);
      expect(asset.objectKey).toBe(props.objectKey);
      expect(asset.mime).toBe(props.mime);
      expect(asset.size).toBe(props.size);
      expect(asset.checksum).toBe(props.checksum);
      expect(asset.ownerContext).toBe(props.ownerContext);
      expect(asset.ownerId).toBe(props.ownerId);
      expect(asset.variants).toBe(props.variants);
      expect(asset.status).toBe(props.status);
      expect(asset.createdAt).toBe(props.createdAt);
    });

    it('rehydrate produces an equivalent aggregate (e.g. an already-ready asset stays ready)', () => {
      const asset = Asset.rehydrate(baseProps({ status: 'ready' }));
      expect(asset.status).toBe('ready');
      expect(asset.markReady()).toBe(false);
    });

    it('supports a null ownerId and empty variants', () => {
      const asset = Asset.create(baseProps({ ownerId: null, variants: [] }));
      expect(asset.ownerId).toBeNull();
      expect(asset.variants).toEqual([]);
    });
  });
});
