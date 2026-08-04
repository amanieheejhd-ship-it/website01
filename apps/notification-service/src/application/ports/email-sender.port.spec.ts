import { EMAIL_SENDER, EmailMessage, EmailSender } from './email-sender.port';
import { NOTIFICATION_REPOSITORY } from '../../domain/repositories/notification.repository';

describe('application layer tokens & ports', () => {
  it('EMAIL_SENDER is a distinct injection Symbol', () => {
    expect(typeof EMAIL_SENDER).toBe('symbol');
    expect(EMAIL_SENDER.toString()).toBe('Symbol(EMAIL_SENDER)');
    expect(EMAIL_SENDER).not.toBe(NOTIFICATION_REPOSITORY);
  });

  it('NOTIFICATION_REPOSITORY is a distinct injection Symbol', () => {
    expect(typeof NOTIFICATION_REPOSITORY).toBe('symbol');
    expect(NOTIFICATION_REPOSITORY.toString()).toBe(
      'Symbol(NOTIFICATION_REPOSITORY)',
    );
  });

  it('an EmailSender implementation conforms to the port contract', async () => {
    const sent: EmailMessage[] = [];
    const sender: EmailSender = {
      send: async (message) => {
        sent.push(message);
      },
    };

    const message: EmailMessage = {
      to: 'user@example.com',
      subject: 'Hello',
      text: 'plain body',
      html: '<p>rich body</p>',
    };
    await sender.send(message);

    expect(sent).toEqual([message]);
  });
});
