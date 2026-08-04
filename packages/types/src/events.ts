/**
 * Redis event bus channels + the envelope every domain event carries
 * (docs/API-CONTRACTS.md §Event channels, docs/ARCHITECTURE.md §6).
 *
 * Durable, retry-sensitive delivery (notification-service) rides a Redis Stream with a
 * consumer group; consumers dedupe on `correlationId`.
 */

export const EVENTS = {
  contactSubmitted: 'contact.submitted',
  quotationRequested: 'quotation.requested',
  quotationStatusChanged: 'quotation.statusChanged',
  mediaUploaded: 'media.uploaded',
  mediaReady: 'media.ready',
  cmsPublished: 'cms.published',
  projectPublished: 'project.published',
  userRegistered: 'user.registered',
  userRoleChanged: 'user.roleChanged',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Every event payload is wrapped in this envelope before it hits the bus. */
export interface DomainEvent<TData = unknown> {
  id: string;
  occurredAt: string;
  correlationId: string;
  version: number;
  name: EventName;
  data: TData;
}
