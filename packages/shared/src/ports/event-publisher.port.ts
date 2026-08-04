import type { DomainEvent } from '@fardeen/types';

/** DI token for the outbound EventPublisher port (bound to a Redis adapter per service). */
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

/**
 * Outbound port a use case emits domain events through. The application layer depends on
 * this interface only — never on ioredis directly (docs/ARCHITECTURE.md §5).
 */
export interface EventPublisher {
  publish<T>(event: DomainEvent<T>): Promise<void>;
}
