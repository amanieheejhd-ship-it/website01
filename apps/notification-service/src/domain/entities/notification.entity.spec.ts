import {
  Notification,
  NotificationProps,
} from './notification.entity';

describe('Notification entity', () => {
  const fixedDate = new Date('2026-08-04T12:00:00.000Z');

  const createInput = () => ({
    id: 'notif-1',
    channel: 'email' as const,
    template: 'welcome',
    to: 'user@example.com',
    payload: { name: 'Fardeen' },
    correlationId: 'corr-1',
    createdAt: fixedDate,
  });

  describe('create()', () => {
    it('builds a queued notification with zero attempts and exposes every getter', () => {
      const input = createInput();
      const n = Notification.create(input);

      expect(n.id).toBe('notif-1');
      expect(n.channel).toBe('email');
      expect(n.template).toBe('welcome');
      expect(n.to).toBe('user@example.com');
      expect(n.payload).toEqual({ name: 'Fardeen' });
      expect(n.status).toBe('queued');
      expect(n.attempts).toBe(0);
      expect(n.correlationId).toBe('corr-1');
      expect(n.createdAt).toBe(fixedDate);
    });

    it('supports the webhook channel', () => {
      const n = Notification.create({ ...createInput(), channel: 'webhook' });
      expect(n.channel).toBe('webhook');
    });
  });

  describe('rehydrate()', () => {
    it('restores all persisted props verbatim', () => {
      const props: NotificationProps = {
        id: 'notif-2',
        channel: 'webhook',
        template: 'order.shipped',
        to: 'https://hooks.example.com/x',
        payload: { orderId: 42 },
        status: 'failed',
        attempts: 3,
        correlationId: 'corr-2',
        createdAt: fixedDate,
      };
      const n = Notification.rehydrate(props);

      expect(n.id).toBe('notif-2');
      expect(n.channel).toBe('webhook');
      expect(n.template).toBe('order.shipped');
      expect(n.to).toBe('https://hooks.example.com/x');
      expect(n.payload).toEqual({ orderId: 42 });
      expect(n.status).toBe('failed');
      expect(n.attempts).toBe(3);
      expect(n.correlationId).toBe('corr-2');
      expect(n.createdAt).toBe(fixedDate);
    });

    it('copies props so later mutation of the source object does not leak in', () => {
      const props: NotificationProps = {
        ...createInput(),
        status: 'queued',
        attempts: 0,
      };
      const n = Notification.rehydrate(props);
      props.status = 'sent';
      expect(n.status).toBe('queued');
    });
  });

  describe('state transitions', () => {
    it('markSent() moves status to sent', () => {
      const n = Notification.create(createInput());
      n.markSent();
      expect(n.status).toBe('sent');
    });

    it('markFailed() moves status to failed', () => {
      const n = Notification.create(createInput());
      n.markFailed();
      expect(n.status).toBe('failed');
    });

    it('incrementAttempt() increases the attempt counter each call', () => {
      const n = Notification.create(createInput());
      expect(n.attempts).toBe(0);
      n.incrementAttempt();
      expect(n.attempts).toBe(1);
      n.incrementAttempt();
      expect(n.attempts).toBe(2);
    });

    it('transitions are independent of the attempt counter', () => {
      const n = Notification.create(createInput());
      n.incrementAttempt();
      n.markFailed();
      n.incrementAttempt();
      n.markSent();
      expect(n.attempts).toBe(2);
      expect(n.status).toBe('sent');
    });
  });
});
