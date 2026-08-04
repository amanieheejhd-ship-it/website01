import { randomUUID } from 'node:crypto';
import { ok, type PresignUploadPayload, type PresignUploadResult, type Result } from '@fardeen/types';
import { Asset } from '../../domain/entities/asset.entity';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import type { MediaStore } from '../ports/media-store.port';
import { toErr } from '../result.util';

/** Create a pending Asset + return a presigned PUT url (direct-to-MinIO; bytes bypass the gateway). */
export class PresignUpload {
  constructor(
    private readonly repo: AssetRepository,
    private readonly store: MediaStore,
  ) {}

  async execute(payload: PresignUploadPayload): Promise<Result<PresignUploadResult>> {
    try {
      const id = randomUUID();
      const safeName = payload.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `${payload.ownerContext}/${id}/${safeName}`;
      const asset = Asset.create({
        id,
        bucket: this.store.bucket,
        objectKey,
        mime: payload.mime,
        size: 0,
        checksum: '',
        ownerContext: payload.ownerContext,
        ownerId: payload.ownerId ?? null,
        variants: [],
        status: 'pending',
        createdAt: new Date(),
      });
      await this.repo.save(asset);
      const url = await this.store.presignPut(objectKey);
      return ok({ assetId: id, bucket: this.store.bucket, objectKey, url, fields: {} });
    } catch (e) {
      return toErr(e);
    }
  }
}
