import { HandleQuotationStatusChanged } from './handle-quotation-status-changed';
import type { Notification, NotificationStatus } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailMessage, EmailSender } from '../ports/email-sender.port';
import type { DomainEvent, QuotationStatusChangedData } from '@fardeen/types';

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

const event: DomainEvent<QuotationStatusChangedData> = {
  id: 'evt-3',
  occurredAt: '2026-08-04T12:00:00.000Z',
  correlationId: 'corr-status',
  version: 1,
  name: 'quotation.statusChanged',
  data: { quotationId: 'q-9', email: 'client@example.com', from: 'draft', to: 'sent' },
};

describe('HandleQuotationStatusChanged', () => {
  it('emails the client the status update and marks processed', async () => {
    const email = new FakeEmail();
    const repo = new FakeRepo();
    const handler = new HandleQuotationStatusChanged(email, repo);

    await handler.execute(event);

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('client@example.com');
    expect(email.sent[0].subject).toBe('Your Fardeen quotation q-9 is now "sent"');
    expect(email.sent[0].text).toContain('"draft"');
    expect(email.sent[0].text).toContain('"sent"');
    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].status).toBe('sent');
    expect(repo.markProcessedCalls).toBe(1);
  });

  it('is idempotent on redelivery', async () => {
    const email = new FakeEmail();
    const repo = new FakeRepo();
    repo.processed.add('corr-status');
    const handler = new HandleQuotationStatusChanged(email, repo);

    await handler.execute(event);

    expect(email.sent).toHaveLength(0);
    expect(repo.saved).toHaveLength(0);
    expect(repo.markProcessedCalls).toBe(0);
  });
});
