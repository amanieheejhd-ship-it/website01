import { ok, type ResolveManyPayload, type ResolveManyResult, type Result } from '@fardeen/types';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import type { MediaStore } from '../ports/media-store.port';
import { toResolved } from '../mappers/asset.mapper';

/** Batch-resolve reference ids → presigned GET urls (used by the gateway composition). No stat/IO
 *  round-trip per id — presigning is a local signing operation. Missing ids are omitted. */
export class ResolveMany {
  constructor(
    private readonly repo: AssetRepository,
    private readonly store: MediaStore,
  ) {}

  async execute(payload: ResolveManyPayload): Promise<Result<ResolveManyResult>> {
    const ids = Array.from(new Set(payload.ids)).filter(Boolean);
    if (ids.length === 0) return ok({});

    const assets = await this.repo.findManyByIds(ids);
    const out: ResolveManyResult = {};
    for (const a of assets) {
      const url = await this.store.presignGet(a.objectKey);
      const variants = await Promise.all(
        a.variants.map(async (v) => ({ kind: v.kind, url: await this.store.presignGet(v.objectKey) })),
      );
      out[a.id] = toResolved(a, url, variants);
    }
    return ok(out);
  }
}
