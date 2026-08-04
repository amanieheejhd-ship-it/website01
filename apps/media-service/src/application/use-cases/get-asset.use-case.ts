import { EVENTS, err, type GetAssetPayload, type MediaRefResolved, ok, type Result } from '@fardeen/types';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import type { EventPublisher } from '../ports/event-publisher.port';
import type { MediaStore } from '../ports/media-store.port';
import { toResolved } from '../mappers/asset.mapper';
import { toErr } from '../result.util';

/**
 * Resolve one asset to presigned GET urls. Lazy confirmation: if the object now exists in MinIO and
 * the asset was still pending, mark it ready and emit media.uploaded (once).
 */
export class GetAsset {
  constructor(
    private readonly repo: AssetRepository,
    private readonly store: MediaStore,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: GetAssetPayload): Promise<Result<MediaRefResolved>> {
    try {
      const asset = await this.repo.findById(payload.id);
      if (!asset) {
        return err({ code: 'ASSET_NOT_FOUND', message: 'Asset not found' });
      }
      if (await this.store.exists(asset.objectKey)) {
        if (asset.markReady()) {
          await this.repo.save(asset);
          await this.events.publish({
            name: EVENTS.mediaUploaded,
            data: { assetId: asset.id, ownerContext: asset.ownerContext, objectKey: asset.objectKey },
          });
        }
      }
      const url = await this.store.presignGet(asset.objectKey);
      const variants = await Promise.all(
        asset.variants.map(async (v) => ({ kind: v.kind, url: await this.store.presignGet(v.objectKey) })),
      );
      return ok(toResolved(asset, url, variants));
    } catch (e) {
      return toErr(e);
    }
  }
}
