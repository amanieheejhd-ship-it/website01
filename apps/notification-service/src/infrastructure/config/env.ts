import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const schema = z.object({
  SERVICE_NAME: z.string().default('notification-service'),
  NOTIFICATION_DATABASE_URL: z.string().min(1, 'NOTIFICATION_DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('Ansari Space Craft <no-reply@fardeen.example>'),
  SALES_INBOX: z.string().default('sales@fardeen.example'),
  NOTIFICATION_GROUP: z.string().default('notification'),
  NOTIFICATION_CONSUMER: z.string().default('notification-1'),
  NOTIFICATION_MAX_ATTEMPTS: z.coerce.number().default(5),
  NOTIFICATION_RECLAIM_IDLE_MS: z.coerce.number().default(15_000),
  NOTIFICATION_BLOCK_MS: z.coerce.number().default(5_000),
  NOTIFICATION_BATCH: z.coerce.number().default(10),
});

export interface AppConfig {
  serviceName: string;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
  mailFrom: string;
  salesInbox: string;
  group: string;
  consumerName: string;
  maxAttempts: number;
  reclaimIdleMs: number;
  blockMs: number;
  batch: number;
}

export function loadConfig(): AppConfig {
  const e = schema.parse(process.env);
  return {
    serviceName: e.SERVICE_NAME,
    databaseUrl: e.NOTIFICATION_DATABASE_URL,
    redisHost: e.REDIS_HOST,
    redisPort: e.REDIS_PORT,
    redisPassword: e.REDIS_PASSWORD || undefined,
    smtpHost: e.SMTP_HOST,
    smtpPort: e.SMTP_PORT,
    smtpUser: e.SMTP_USER || undefined,
    smtpPassword: e.SMTP_PASSWORD || undefined,
    mailFrom: e.MAIL_FROM,
    salesInbox: e.SALES_INBOX,
    group: e.NOTIFICATION_GROUP,
    consumerName: e.NOTIFICATION_CONSUMER,
    maxAttempts: e.NOTIFICATION_MAX_ATTEMPTS,
    reclaimIdleMs: e.NOTIFICATION_RECLAIM_IDLE_MS,
    blockMs: e.NOTIFICATION_BLOCK_MS,
    batch: e.NOTIFICATION_BATCH,
  };
}
