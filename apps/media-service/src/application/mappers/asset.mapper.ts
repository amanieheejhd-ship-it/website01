import type { AssetVariantDto, MediaRefResolved } from '@fardeen/types';
import type { Asset } from '../../domain/entities/asset.entity';

export function toResolved(asset: Asset, url: string, variants: AssetVariantDto[]): MediaRefResolved {
  return {
    id: asset.id,
    url,
    status: asset.status,
    mime: asset.mime,
    variants,
  };
}
