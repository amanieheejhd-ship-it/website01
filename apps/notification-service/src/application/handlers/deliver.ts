import { randomUUID } from 'node:crypto';
import { Notification } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailMessage, EmailSender } from '../ports/email-sender.port';

/** Send one email + persist its Notification row (queued → sent / failed). On failure the failed row
 *  is persisted and the error rethrown so the stream consumer does NOT ack → the message is retried. */
export async function deliverEmail(
  email: EmailSender,
  repo: NotificationRepository,
  args: { template: string; correlationId: string; payload: unknown; message: EmailMessage },
): Promise<void> {
  const notification = Notification.create({
    id: randomUUID(),
    channel: 'email',
    template: args.template,
    to: args.message.to,
    payload: args.payload,
    correlationId: args.correlationId,
    createdAt: new Date(),
  });
  notification.incrementAttempt();
  try {
    await email.send(args.message);
    notification.markSent();
    await repo.save(notification);
  } catch (e) {
    notification.markFailed();
    await repo.save(notification);
    throw e;
  }
}
