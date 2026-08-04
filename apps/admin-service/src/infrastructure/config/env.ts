import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const schema = z.object({
  SERVICE_NAME: z.string().default('admin-service'),
  PROJECT_SERVICE_HOST: z.string().default('localhost'),
  PROJECT_SERVICE_PORT: z.coerce.number().default(4012),
  SERVICE_MGMT_HOST: z.string().default('localhost'),
  SERVICE_MGMT_PORT: z.coerce.number().default(4013),
  CMS_SERVICE_HOST: z.string().default('localhost'),
  CMS_SERVICE_PORT: z.coerce.number().default(4011),
  CONTACT_SERVICE_HOST: z.string().default('localhost'),
  CONTACT_SERVICE_PORT: z.coerce.number().default(4014),
  QUOTATION_SERVICE_HOST: z.string().default('localhost'),
  QUOTATION_SERVICE_PORT: z.coerce.number().default(4015),
  MEDIA_SERVICE_HOST: z.string().default('localhost'),
  MEDIA_SERVICE_PORT: z.coerce.number().default(4016),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  DASHBOARD_CACHE_TTL: z.coerce.number().default(10),
});

export interface ServiceLocation {
  host: string;
  port: number;
}

export interface AppConfig {
  serviceName: string;
  services: {
    project: ServiceLocation;
    service: ServiceLocation;
    cms: ServiceLocation;
    contact: ServiceLocation;
    quotation: ServiceLocation;
    media: ServiceLocation;
  };
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  dashboardCacheTtl: number;
}

/** Fail-fast env parse at DI construction (docs/ARCHITECTURE.md §9). */
export function loadConfig(): AppConfig {
  const env = schema.parse(process.env);
  return {
    serviceName: env.SERVICE_NAME,
    services: {
      project: { host: env.PROJECT_SERVICE_HOST, port: env.PROJECT_SERVICE_PORT },
      service: { host: env.SERVICE_MGMT_HOST, port: env.SERVICE_MGMT_PORT },
      cms: { host: env.CMS_SERVICE_HOST, port: env.CMS_SERVICE_PORT },
      contact: { host: env.CONTACT_SERVICE_HOST, port: env.CONTACT_SERVICE_PORT },
      quotation: { host: env.QUOTATION_SERVICE_HOST, port: env.QUOTATION_SERVICE_PORT },
      media: { host: env.MEDIA_SERVICE_HOST, port: env.MEDIA_SERVICE_PORT },
    },
    redisHost: env.REDIS_HOST,
    redisPort: env.REDIS_PORT,
    redisPassword: env.REDIS_PASSWORD,
    dashboardCacheTtl: env.DASHBOARD_CACHE_TTL,
  };
}
