import type { DomainEvent, QuotationRequestedData } from '@fardeen/types';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailSender } from '../ports/email-sender.port';
import { deliverEmail } from './deliver';

/** quotation.requested → email sales. Idempotent on correlationId. */
export class HandleQuotationRequested {
  constructor(
    private readonly email: EmailSender,
    private readonly notifications: NotificationRepository,
    private readonly salesInbox: string,
  ) {}

  async execute(event: DomainEvent<QuotationRequestedData>): Promise<void> {
    if (await this.notifications.isProcessed(event.correlationId)) return;
    const { quotationId, email } = event.data;

    await deliverEmail(this.email, this.notifications, {
      template: 'quotation-sales',
      correlationId: event.correlationId,
      payload: { quotationId, from: email },
      message: {
        to: this.salesInbox,
        subject: `New quotation request ${quotationId}`,
        text: `A new quotation request (${quotationId}) was submitted by ${email}.`,
      },
    });

    await this.notifications.markProcessed(event.correlationId);
  }
}
