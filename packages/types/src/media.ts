import { z } from 'zod';

/** Media contracts — media-service owns media_db (docs/DOMAIN-MODEL.md §Media). Bytes bypass the
 *  gateway: uploads are presigned direct-to-MinIO. Resolution happens ONLY at the gateway. */

export type OwnerContext = 'cms' | 'project' | 'quotation';
export type AssetStatus = 'pending' | 'ready';

export interface AssetVariantDto {
  kind: string; // thumb | poster | webp | avif | glb-draco
  url: string;
}

/** A resolved media reference (returned by MEDIA_PATTERNS.resolveMany / GET /media/:id). */
export interface MediaRefResolved {
  id: string;
  url: string | null; // presigned/public GET url
  status: AssetStatus;
  mime: string;
  variants: AssetVariantDto[];
}

export const presignUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  ownerContext: z.enum(['cms', 'project', 'quotation']),
  ownerId: z.string().optional(),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export interface PresignUploadPayload extends PresignUploadInput {
  correlationId?: string;
}
export interface PresignUploadResult {
  assetId: string;
  bucket: string;
  objectKey: string;
  url: string; // presigned PUT url (direct-to-MinIO)
  fields: Record<string, string>; // empty for PUT; populated for POST-policy uploads
}

export interface GetAssetPayload {
  id: string;
}
export interface ResolveManyPayload {
  ids: string[];
}
export type ResolveManyResult = Record<string, MediaRefResolved>;

export interface MediaUploadedData {
  assetId: string;
  ownerContext: OwnerContext;
  objectKey: string;
}
