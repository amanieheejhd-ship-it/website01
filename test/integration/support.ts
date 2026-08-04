/**
 * Shared helpers for integration tests against the native Postgres (5432) + Redis (6379).
 * Each spec constructs its OWN service PrismaClient (from apps/<svc>/generated/client) pointed at a
 * dedicated <db>_test database, and closes every connection in afterAll.
 */
import Redis from 'ioredis';

const PG_USER = 'fardeen';
const PG_PASSWORD = 'fardeen_dev_pw';

/** Connection URL for a dedicated *_test database. */
export function testDbUrl(dbName: string): string {
  return `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:5432/${dbName}?schema=public`;
}

/** A fresh ioredis client to the native Redis. Callers MUST quit() it in afterAll. */
export function makeRedis(): Redis {
  return new Redis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });
}

/** Truncate the given tables (RESTART IDENTITY CASCADE) via a Prisma $executeRawUnsafe fn. */
export async function truncate(
  execRaw: (sql: string) => Promise<unknown>,
  tables: string[],
): Promise<void> {
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t}"`).join(', ');
  await execRaw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Delete Redis stream keys + their consumer group so a durability test starts clean. */
export async function resetStreams(redis: Redis, streamKeys: string[]): Promise<void> {
  if (streamKeys.length > 0) await redis.del(...streamKeys);
}

/** Poll a predicate until it returns truthy or the timeout elapses (for async consumer effects). */
export async function waitFor<T>(
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const intervalMs = opts.intervalMs ?? 100;
  const deadline = Date.now() + timeoutMs;
  let last: T = await fn();
  while (!last) {
    if (Date.now() >= deadline) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
    last = await fn();
  }
  return last;
}
