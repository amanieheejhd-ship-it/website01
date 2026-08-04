import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const schema = z.object({
  SERVICE_NAME: z.string().default('media-service'),
  MEDIA_DATABASE_URL: z.string().min(1, 'MEDIA_DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.string().default('false'),
  MINIO_ROOT_USER: z.string().default('fardeen'),
  MINIO_ROOT_PASSWORD: z.string().min(1, 'MINIO_ROOT_PASSWORD is required'),
  MINIO_BUCKET: z.string().default('fardeen-media'),
});

export interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export interface AppConfig {
  serviceName: string;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  minio: MinioConfig;
}

export function loadConfig(): AppConfig {
  const e = schema.parse(process.env);
  return {
    serviceName: e.SERVICE_NAME,
    databaseUrl: e.MEDIA_DATABASE_URL,
    redisHost: e.REDIS_HOST,
    redisPort: e.REDIS_PORT,
    redisPassword: e.REDIS_PASSWORD || undefined,
    minio: {
      endpoint: e.MINIO_ENDPOINT,
      port: e.MINIO_PORT,
      useSSL: e.MINIO_USE_SSL === 'true',
      accessKey: e.MINIO_ROOT_USER,
      secretKey: e.MINIO_ROOT_PASSWORD,
      bucket: e.MINIO_BUCKET,
    },
  };
}
