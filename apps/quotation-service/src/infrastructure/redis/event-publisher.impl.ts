import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { DomainEvent } from '@fardeen/types';
import type { DomainEventInput, EventPublisher } from '../../application/ports/event-publisher.port';

/**
 * Dual-write domain-event publisher (docs/ARCHITECTURE.md ADR-002):
 *   (a) XADD → durable Redis Stream `stream:<name>` — consumer-group delivery that survives
 *       consumer downtime and is retryable (e.g. notification-service).
 *   (b) PUBLISH `<name>` — ephemeral pub/sub, kept for 4c-2 cache invalidation.
 * The EventPublisher port is unchanged.
 */
export class RedisEventPublisher implements EventPublisher {
  constructor(private readonly redis: Redis) {}

  async publish<T>(input: DomainEventInput<T>): Promise<void> {
    const event: DomainEvent<T> = {
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      correlationId: input.correlationId ?? randomUUID(),
      version: 1,
      name: input.name,
      data: input.data,
    };
    const payload = JSON.stringify(event);
    await this.redis.xadd(`stream:${input.name}`, '*', 'event', payload);
    await this.redis.publish(input.name, payload);
  }
}
