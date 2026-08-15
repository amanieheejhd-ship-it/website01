import type { ContactSubmittedData, DomainEvent } from '@fardeen/types';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailSender } from '../ports/email-sender.port';
import { deliverEmail } from './deliver';

/** contact.submitted → email sales + auto-reply to the submitter. Idempotent on correlationId. */
export class HandleContactSubmitted {
  constructor(
    private readonly email: EmailSender,
    private readonly notifications: NotificationRepository,
    private readonly salesInbox: string,
  ) {}

  async execute(event: DomainEvent<ContactSubmittedData>): Promise<void> {
    if (await this.notifications.isProcessed(event.correlationId)) return;
    const { contactId, email, subject } = event.data;

    await deliverEmail(this.email, this.notifications, {
      template: 'contact-sales',
      correlationId: event.correlationId,
      payload: { contactId, from: email, subject },
      message: {
        to: this.salesInbox,
        subject: `New contact enquiry: ${subject}`,
        text: `New contact submission ${contactId}\nFrom: ${email}\nSubject: ${subject}`,
      },
    });

    await deliverEmail(this.email, this.notifications, {
      template: 'contact-autoreply',
      correlationId: event.correlationId,
      payload: { contactId },
      message: {
        to: email,
        subject: 'We received your message — Ansari Space Craft',
        text: 'Thanks for reaching out to Ansari Space Craft. Our team will get back to you shortly.',
      },
    });

    await this.notifications.markProcessed(event.correlationId);
  }
}
