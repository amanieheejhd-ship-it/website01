export const MEDIA_STORE = Symbol('MEDIA_STORE');

/** Object-storage port (MinIO adapter). Bytes never pass through the service/gateway — the client
 *  uploads/downloads directly via presigned URLs. */
export interface MediaStore {
  readonly bucket: string;
  presignPut(objectKey: string, expirySeconds?: number): Promise<string>;
  presignGet(objectKey: string, expirySeconds?: number): Promise<string>;
  exists(objectKey: string): Promise<boolean>;
}
