import { Inject, Injectable } from '@nestjs/common';
import type { DashboardCounters } from '@fardeen/types';
import { Redis } from 'ioredis';
import type { DashboardCache } from '../application/ports/dashboard-cache.port';
import { REDIS_CLIENT } from './redis/redis.tokens';

/** The only state admin-service touches: a short-TTL Redis cache for the dashboard snapshot. */
@Injectable()
export class RedisDashboardCache implements DashboardCache {
  private readonly key = 'admin:dashboard';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(): Promise<DashboardCounters | null> {
    const raw = await this.redis.get(this.key);
    return raw ? (JSON.parse(raw) as DashboardCounters) : null;
  }

  async set(value: DashboardCounters, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key, JSON.stringify(value), 'EX', Math.max(1, Math.floor(ttlSeconds)));
  }
}
