import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

export const GATEWAY_CONFIG = Symbol('GATEWAY_CONFIG');

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  GATEWAY_PORT: z.coerce.number().default(4000),
  GATEWAY_GLOBAL_PREFIX: z.string().default('api/v1'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),
  JWT_ISSUER: z.string().default('fardeen-auth'),
  JWT_AUDIENCE: z.string().default('fardeen-api'),
  AUTH_SERVICE_HOST: z.string().default('localhost'),
  AUTH_SERVICE_PORT: z.coerce.number().default(4010),
  CMS_SERVICE_HOST: z.string().default('localhost'),
  CMS_SERVICE_PORT: z.coerce.number().default(4011),
  PROJECT_SERVICE_HOST: z.string().default('localhost'),
  PROJECT_SERVICE_PORT: z.coerce.number().default(4012),
  SERVICE_MGMT_HOST: z.string().default('localhost'),
  SERVICE_MGMT_PORT: z.coerce.number().default(4013),
  CONTACT_SERVICE_HOST: z.string().default('localhost'),
  CONTACT_SERVICE_PORT: z.coerce.number().default(4014),
  QUOTATION_SERVICE_HOST: z.string().default('localhost'),
  QUOTATION_SERVICE_PORT: z.coerce.number().default(4015),
  MEDIA_SERVICE_HOST: z.string().default('localhost'),
  MEDIA_SERVICE_PORT: z.coerce.number().default(4016),
  ADMIN_SERVICE_HOST: z.string().default('localhost'),
  ADMIN_SERVICE_PORT: z.coerce.number().default(4017),
  REFRESH_COOKIE_NAME: z.string().default('fardeen_rt'),
  REFRESH_TTL_SECONDS: z.coerce.number().default(1_209_600),
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  WRITE_RATE_LIMIT_MAX: z.coerce.number().default(5),
});

export interface ServiceLocation {
  host: string;
  port: number;
}

export interface GatewayConfig {
  isProd: boolean;
  port: number;
  globalPrefix: string;
  corsOrigins: string[];
  jwtPublicKey: string;
  jwtIssuer: string;
  jwtAudience: string;
  refreshCookieName: string;
  refreshTtlSeconds: number;
  rateLimitTtl: number;
  rateLimitMax: number;
  authRateLimitMax: number;
  writeRateLimitMax: number;
  services: {
    auth: ServiceLocation;
    cms: ServiceLocation;
    project: ServiceLocation;
    service: ServiceLocation;
    contact: ServiceLocation;
    quotation: ServiceLocation;
    media: ServiceLocation;
    admin: ServiceLocation;
  };
}

export function loadGatewayConfig(): GatewayConfig {
  const env = schema.parse(process.env);
  const jwtPublicKey = env.JWT_PUBLIC_KEY
    ? env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
    : readFileSync(resolve(process.cwd(), requirePath(env.JWT_PUBLIC_KEY_PATH)), 'utf8');

  return {
    isProd: env.NODE_ENV === 'production',
    port: env.GATEWAY_PORT,
    globalPrefix: env.GATEWAY_GLOBAL_PREFIX,
    corsOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    jwtPublicKey,
    jwtIssuer: env.JWT_ISSUER,
    jwtAudience: env.JWT_AUDIENCE,
    refreshCookieName: env.REFRESH_COOKIE_NAME,
    refreshTtlSeconds: env.REFRESH_TTL_SECONDS,
    rateLimitTtl: env.RATE_LIMIT_TTL,
    rateLimitMax: env.RATE_LIMIT_MAX,
    authRateLimitMax: env.AUTH_RATE_LIMIT_MAX,
    writeRateLimitMax: env.WRITE_RATE_LIMIT_MAX,
    services: {
      auth: { host: env.AUTH_SERVICE_HOST, port: env.AUTH_SERVICE_PORT },
      cms: { host: env.CMS_SERVICE_HOST, port: env.CMS_SERVICE_PORT },
      project: { host: env.PROJECT_SERVICE_HOST, port: env.PROJECT_SERVICE_PORT },
      service: { host: env.SERVICE_MGMT_HOST, port: env.SERVICE_MGMT_PORT },
      contact: { host: env.CONTACT_SERVICE_HOST, port: env.CONTACT_SERVICE_PORT },
      quotation: { host: env.QUOTATION_SERVICE_HOST, port: env.QUOTATION_SERVICE_PORT },
      media: { host: env.MEDIA_SERVICE_HOST, port: env.MEDIA_SERVICE_PORT },
      admin: { host: env.ADMIN_SERVICE_HOST, port: env.ADMIN_SERVICE_PORT },
    },
  };
}

function requirePath(p: string | undefined): string {
  if (!p) throw new Error('JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH must be set');
  return p;
}
