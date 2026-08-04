import { HandleContactSubmitted } from './handle-contact-submitted';
import type { Notification, NotificationStatus } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailMessage, EmailSender } from '../ports/email-sender.port';
import type { ContactSubmittedData, DomainEvent } from '@fardeen/types';

class FakeRepo implements NotificationRepository {
  saved: Notification[] = [];
  processed = new Set<string>();
  markProcessedCalls = 0;
  async save(n: Notification): Promise<void> {
    this.saved.push(n);
  }
  async countByStatus(status: NotificationStatus): Promise<number> {
    return this.saved.filter((n) => n.status === status).length;
  }
  async isProcessed(correlationId: string): Promise<boolean> {
    return this.processed.has(correlationId);
  }
  async markProcessed(correlationId: string): Promise<void> {
    this.markProcessedCalls += 1;
    this.processed.add(correlationId);
  }
}

class FakeEmail implements EmailSender {
  sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

const event: DomainEvent<ContactSubmittedData> = {
  id: 'evt-1',
  occurredAt: '2026-08-04T12:00:00.000Z',
  correlationId: 'corr-contact',
  version: 1,
  name: 'contact.submitted',
  data: { contactId: 'c-1', email: 'client@example.com', subject: 'Need a quote' },
};

describe('HandleContactSubmitted', () => {
  it('emails sales + auto-reply, then marks the correlationId processed', async () => {
    const email = new FakeEmail();
    const repo = new FakeRepo();
    const handler = new HandleContactSubmitted(email, repo, 'sales@fardeen.com');

    await handler.execute(event);

    expect(email.sent).toHaveLength(2);
    const [sales, autoreply] = email.sent;
    expect(sales.to).toBe('sales@fardeen.com');
    expect(sales.subject).toBe('New contact enquiry: Need a quote');
    expect(sales.text).toContain('c-1');
    expect(sales.text).toContain('client@example.com');
    expect(autoreply.to).toBe('client@example.com');
    expect(autoreply.subject).toContain('We received your message');

    expect(repo.saved).toHaveLength(2);
    expect(repo.saved.every((n) => n.status === 'sent')).toBe(true);
    expect(repo.processed.has('corr-contact')).toBe(true);
    expect(repo.markProcessedCalls).toBe(1);
  });

  it('is idempotent: a redelivered event does nothing', async () => {
    const email = new FakeEmail();
    const repo = new FakeRepo();
    repo.processed.add('corr-contact');
    const handler = new HandleContactSubmitted(email, repo, 'sales@fardeen.com');

    await handler.execute(event);

    expect(email.sent).toHaveLength(0);
    expect(repo.saved).toHaveLength(0);
    expect(repo.markProcessedCalls).toBe(0);
  });
});
