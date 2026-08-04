import { deliverEmail } from './deliver';
import type { Notification, NotificationStatus } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { EmailMessage, EmailSender } from '../ports/email-sender.port';

class FakeRepo implements NotificationRepository {
  saved: Notification[] = [];
  processed = new Set<string>();
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
    this.processed.add(correlationId);
  }
}

class FakeEmail implements EmailSender {
  sent: EmailMessage[] = [];
  error: Error | null = null;
  async send(message: EmailMessage): Promise<void> {
    if (this.error) throw this.error;
    this.sent.push(message);
  }
}

const message: EmailMessage = {
  to: 'user@example.com',
  subject: 'Hi',
  text: 'body',
};

describe('deliverEmail', () => {
  it('sends the email then persists a sent notification (one attempt)', async () => {
    const email = new FakeEmail();
    const repo = new FakeRepo();

    await deliverEmail(email, repo, {
      template: 'welcome',
      correlationId: 'corr-1',
      payload: { a: 1 },
      message,
    });

    expect(email.sent).toEqual([message]);
    expect(repo.saved).toHaveLength(1);
    const n = repo.saved[0];
    expect(n.status).toBe('sent');
    expect(n.attempts).toBe(1);
    expect(n.channel).toBe('email');
    expect(n.template).toBe('welcome');
    expect(n.to).toBe('user@example.com');
    expect(n.payload).toEqual({ a: 1 });
    expect(n.correlationId).toBe('corr-1');
  });

  it('persists a failed notification and rethrows when the sender throws', async () => {
    const email = new FakeEmail();
    email.error = new Error('smtp down');
    const repo = new FakeRepo();

    await expect(
      deliverEmail(email, repo, {
        template: 'welcome',
        correlationId: 'corr-2',
        payload: null,
        message,
      }),
    ).rejects.toThrow('smtp down');

    expect(email.sent).toHaveLength(0);
    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].status).toBe('failed');
    expect(repo.saved[0].attempts).toBe(1);
  });
});
