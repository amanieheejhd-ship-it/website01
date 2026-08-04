import type { Asset } from '../entities/asset.entity';

export const ASSET_REPOSITORY = Symbol('ASSET_REPOSITORY');

export interface AssetRepository {
  findById(id: string): Promise<Asset | null>;
  findManyByIds(ids: string[]): Promise<Asset[]>;
  save(asset: Asset): Promise<void>;
}
