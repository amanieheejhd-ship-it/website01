import { Client } from 'minio';
import type { MediaStore } from '../../application/ports/media-store.port';
import type { MinioConfig } from '../config/env';

/** MinIO adapter for the MediaStore port. Presigned URLs let the client PUT/GET bytes directly. */
export class MinioMediaStore implements MediaStore {
  private readonly client: Client;
  readonly bucket: string;

  constructor(cfg: MinioConfig) {
    this.bucket = cfg.bucket;
    this.client = new Client({
      endPoint: cfg.endpoint,
      port: cfg.port,
      useSSL: cfg.useSSL,
      accessKey: cfg.accessKey,
      secretKey: cfg.secretKey,
    });
  }

  async ensureBucket(): Promise<void> {
    if (!(await this.client.bucketExists(this.bucket))) {
      await this.client.makeBucket(this.bucket);
    }
  }

  presignPut(objectKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedPutObject(this.bucket, objectKey, expirySeconds);
  }

  presignGet(objectKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }

  async exists(objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectKey);
      return true;
    } catch {
      return false;
    }
  }
}
