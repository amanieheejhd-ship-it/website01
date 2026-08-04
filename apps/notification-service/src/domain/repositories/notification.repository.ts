import type { Notification, NotificationStatus } from '../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  countByStatus(status: NotificationStatus): Promise<number>;
  // idempotency: mark/check a correlationId as fully processed (durable, survives redelivery)
  isProcessed(correlationId: string): Promise<boolean>;
  markProcessed(correlationId: string): Promise<void>;
}
