import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

const schema = z.object({
  SERVICE_NAME: z.string().default('auth-service'),
  TCP_PORT: z.coerce.number().default(4010),
  HTTP_PORT: z.coerce.number().default(3010),
  AUTH_DATABASE_URL: z.string().min(1, 'AUTH_DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PRIVATE_KEY_PATH: z.string().optional(),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_ISSUER: z.string().default('fardeen-auth'),
  JWT_AUDIENCE: z.string().default('fardeen-api'),
  REFRESH_TTL_SECONDS: z.coerce.number().default(1_209_600),
  BCRYPT_ROUNDS: z.coerce.number().default(10),
});

export interface AuthConfig {
  serviceName: string;
  tcpPort: number;
  httpPort: number;
  authDatabaseUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  jwtPrivateKey: string;
  jwtAccessTtl: number;
  jwtIssuer: string;
  jwtAudience: string;
  refreshTtlSeconds: number;
  bcryptRounds: number;
}

/** Zod-validated config; fails fast on boot if misconfigured (docs/ARCHITECTURE.md §9). */
export function loadConfig(): AuthConfig {
  const env = schema.parse(process.env);
  const jwtPrivateKey = env.JWT_PRIVATE_KEY
    ? env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
    : readFileSync(resolve(process.cwd(), requirePath(env.JWT_PRIVATE_KEY_PATH)), 'utf8');

  return {
    serviceName: env.SERVICE_NAME,
    tcpPort: env.TCP_PORT,
    httpPort: env.HTTP_PORT,
    authDatabaseUrl: env.AUTH_DATABASE_URL,
    redisHost: env.REDIS_HOST,
    redisPort: env.REDIS_PORT,
    redisPassword: env.REDIS_PASSWORD || undefined,
    jwtPrivateKey,
    jwtAccessTtl: env.JWT_ACCESS_TTL,
    jwtIssuer: env.JWT_ISSUER,
    jwtAudience: env.JWT_AUDIENCE,
    refreshTtlSeconds: env.REFRESH_TTL_SECONDS,
    bcryptRounds: env.BCRYPT_ROUNDS,
  };
}

function requirePath(p: string | undefined): string {
  if (!p) throw new Error('JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH must be set');
  return p;
}
