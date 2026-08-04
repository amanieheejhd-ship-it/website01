import type { DomainEvent, QuotationStatusChangedData } from '@fardeen/types';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailSender } from '../ports/email-sender.port';
import { deliverEmail } from './deliver';

/** quotation.statusChanged → email the client an update. Idempotent on correlationId. */
export class HandleQuotationStatusChanged {
  constructor(
    private readonly email: EmailSender,
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(event: DomainEvent<QuotationStatusChangedData>): Promise<void> {
    if (await this.notifications.isProcessed(event.correlationId)) return;
    const { quotationId, email, from, to } = event.data;

    await deliverEmail(this.email, this.notifications, {
      template: 'quotation-status',
      correlationId: event.correlationId,
      payload: { quotationId, from, to },
      message: {
        to: email,
        subject: `Your Fardeen quotation ${quotationId} is now "${to}"`,
        text: `Your quotation request ${quotationId} moved from "${from}" to "${to}".`,
      },
    });

    await this.notifications.markProcessed(event.correlationId);
  }
}
