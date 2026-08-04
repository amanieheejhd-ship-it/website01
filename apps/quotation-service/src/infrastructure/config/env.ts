import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const schema = z.object({
  SERVICE_NAME: z.string().default('quotation-service'),
  QUOTATION_DATABASE_URL: z.string().min(1, 'QUOTATION_DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
});

export interface AppConfig {
  serviceName: string;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
}

export function loadConfig(): AppConfig {
  const e = schema.parse(process.env);
  return {
    serviceName: e.SERVICE_NAME,
    databaseUrl: e.QUOTATION_DATABASE_URL,
    redisHost: e.REDIS_HOST,
    redisPort: e.REDIS_PORT,
    redisPassword: e.REDIS_PASSWORD || undefined,
  };
}
