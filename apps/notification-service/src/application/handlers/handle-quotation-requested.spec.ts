import { HandleQuotationRequested } from './handle-quotation-requested';
import type { Notification, NotificationStatus } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailMessage, EmailSender } from '../ports/email-sender.port';
import type { DomainEvent, QuotationRequestedData } from '@fardeen/types';

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

const event: DomainEvent<QuotationRequestedData> = {
  id: 'evt-2',
  occurredAt: '2026-08-04T12:00:00.000Z',
  correlationId: 'corr-quote',
  version: 1,
  name: 'quotation.requested',
  data: { quotationId: 'q-1', email: 'buyer@example.com' },
};

describe('HandleQuotationRequested', () => {
  it('emails sales and marks processed', async () => {
    const email = new FakeEmail();
    const repo = new FakeRepo();
    const handler = new HandleQuotationRequested(email, repo, 'sales@fardeen.com');

    await handler.execute(event);

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('sales@fardeen.com');
    expect(email.sent[0].subject).toBe('New quotation request q-1');
    expect(email.sent[0].text).toContain('buyer@example.com');
    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].status).toBe('sent');
    expect(repo.markProcessedCalls).toBe(1);
  });

  it('is idempotent on redelivery', async () => {
    const email = new FakeEmail();
    const repo = new FakeRepo();
    repo.processed.add('corr-quote');
    const handler = new HandleQuotationRequested(email, repo, 'sales@fardeen.com');

    await handler.execute(event);

    expect(email.sent).toHaveLength(0);
    expect(repo.saved).toHaveLength(0);
    expect(repo.markProcessedCalls).toBe(0);
  });
});
