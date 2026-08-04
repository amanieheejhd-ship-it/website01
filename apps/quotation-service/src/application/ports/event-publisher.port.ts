import type { EventName } from '@fardeen/types';

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface DomainEventInput<T = unknown> {
  name: EventName;
  data: T;
  correlationId?: string;
}

/** Outbound port; the Redis adapter wraps the input in the DomainEvent envelope and publishes it. */
export interface EventPublisher {
  publish<T>(event: DomainEventInput<T>): Promise<void>;
}
