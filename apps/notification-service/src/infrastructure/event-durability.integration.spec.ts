/**
 * Integration — DURABLE event delivery (ADR-002) against REAL Redis Streams + real Postgres
 * (notification_db_test). This is the runtime proof of Phase 4c-1:
 *   publish (XADD) → StreamConsumer group → handler → Notification row + EmailSender + ProcessedEvent.
 * Covers: delivery, DURABILITY (drain a backlog published while the consumer was down), IDEMPOTENCY
 * on correlationId, and RETRY → DEAD-LETTER after maxAttempts. EmailSender is mocked (no SMTP).
 */
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import {
  EVENTS,
  type ContactSubmittedData,
  type DomainEvent,
  type QuotationRequestedData,
  type QuotationStatusChangedData,
} from '@fardeen/types';
import { makeRedis, resetStreams, testDbUrl, truncate, waitFor } from '../../../../test/integration/support';
import { PrismaService } from './prisma/prisma.service';
import { PrismaNotificationRepository } from './prisma/notification.repository.impl';
import { StreamConsumer, type Dispatch, type StreamConsumerConfig } from './redis/stream-consumer';
import type { EmailMessage, EmailSender } from '../application/ports/email-sender.port';
import { HandleContactSubmitted } from '../application/handlers/handle-contact-submitted';
import { HandleQuotationRequested } from '../application/handlers/handle-quotation-requested';
import { HandleQuotationStatusChanged } from '../application/handlers/handle-quotation-status-changed';

const SALES = 'sales@fardeen.local';
const GROUP = 'notification-test';
const EVENT_NAMES = [EVENTS.contactSubmitted, EVENTS.quotationRequested, EVENTS.quotationStatusChanged];
const STREAM_KEYS = EVENT_NAMES.map((n) => `stream:${n}`);

describe('Event durability (integration · real Redis Streams + Postgres notification_db_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaNotificationRepository;
  let bus: Redis; // stands in for a producer service's RedisEventPublisher (same XADD wire format)
  let consumer: StreamConsumer | null = null;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('notification_db_test'));
    await prisma.$connect();
    repo = new PrismaNotificationRepository(prisma);
    bus = makeRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await bus.quit();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), ['notifications', 'processed_events']);
    await resetStreams(bus, STREAM_KEYS);
  });

  afterEach(() => {
    consumer?.onModuleDestroy();
    consumer = null;
  });

  /** Publish a domain event exactly as RedisEventPublisher does: XADD stream:<name> * event <json>. */
  async function publish(name: string, data: unknown, correlationId: string): Promise<void> {
    const event = { id: randomUUID(), occurredAt: new Date().toISOString(), correlationId, version: 1, name, data };
    await bus.xadd(`stream:${name}`, '*', 'event', JSON.stringify(event));
  }

  function makeConsumer(email: EmailSender, over: Partial<StreamConsumerConfig> = {}): StreamConsumer {
    const dispatch: Dispatch = {
      [EVENTS.contactSubmitted]: (e) =>
        new HandleContactSubmitted(email, repo, SALES).execute(e as DomainEvent<ContactSubmittedData>),
      [EVENTS.quotationRequested]: (e) =>
        new HandleQuotationRequested(email, repo, SALES).execute(e as DomainEvent<QuotationRequestedData>),
      [EVENTS.quotationStatusChanged]: (e) =>
        new HandleQuotationStatusChanged(email, repo).execute(e as DomainEvent<QuotationStatusChangedData>),
    };
    return new StreamConsumer(
      {
        redisOptions: { host: 'localhost', port: 6379 },
        group: GROUP,
        consumerName: 'test-1',
        eventNames: EVENT_NAMES,
        maxAttempts: 5,
        blockMs: 150,
        batch: 10,
        reclaimIdleMs: 200,
        ...over,
      },
      dispatch,
    );
  }

  const capturingEmail = () => {
    const sent: EmailMessage[] = [];
    const sender: EmailSender = { send: jest.fn(async (m: EmailMessage) => void sent.push(m)) };
    return { sender, sent };
  };

  it('delivers contact.submitted → sends both emails and persists Notifications + a ProcessedEvent', async () => {
    const { sender, sent } = capturingEmail();
    consumer = makeConsumer(sender);
    await consumer.onApplicationBootstrap();

    const cid = randomUUID();
    await publish(EVENTS.contactSubmitted, { contactId: 'c-1', email: 'lead@example.com', subject: 'Villa build' }, cid);

    await waitFor(async () => ((await repo.isProcessed(cid)) ? true : null), { timeoutMs: 15000 });

    expect(sender.send).toHaveBeenCalledTimes(2); // sales + auto-reply
    expect(sent.map((m) => m.to).sort()).toEqual([SALES, 'lead@example.com'].sort());
    const notifs = await prisma.notification.findMany({ where: { correlationId: cid } });
    expect(notifs).toHaveLength(2);
    expect(notifs.every((n) => n.status === 'sent')).toBe(true);
    expect(await repo.isProcessed(cid)).toBe(true);
  });

  it('DURABILITY: drains a backlog published while the consumer was DOWN (pub/sub would have lost it)', async () => {
    const cid = randomUUID();
    // Publish with NO consumer/group running yet — the message sits durably in the stream.
    await publish(EVENTS.quotationRequested, { quotationId: 'q-back', email: 'client@example.com' }, cid);
    expect(await bus.xlen('stream:quotation.requested')).toBe(1);
    expect(await prisma.notification.count({ where: { correlationId: cid } })).toBe(0);

    // Now bring the consumer up → it must drain the backlog.
    const { sender } = capturingEmail();
    consumer = makeConsumer(sender);
    await consumer.onApplicationBootstrap();

    await waitFor(async () => ((await repo.isProcessed(cid)) ? true : null), { timeoutMs: 15000 });
    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(await prisma.notification.count({ where: { correlationId: cid } })).toBe(1);
  });

  it('IDEMPOTENCY: the same correlationId delivered twice yields exactly one Notification + one email', async () => {
    const { sender } = capturingEmail();
    consumer = makeConsumer(sender);
    await consumer.onApplicationBootstrap();

    const cid = randomUUID();
    const data = { quotationId: 'q-dup', email: 'dup@example.com' };
    await publish(EVENTS.quotationRequested, data, cid);
    await waitFor(async () => ((await repo.isProcessed(cid)) ? true : null), { timeoutMs: 15000 });

    // Redeliver the SAME correlationId — the isProcessed guard must short-circuit it.
    await publish(EVENTS.quotationRequested, data, cid);
    await new Promise((r) => setTimeout(r, 2000)); // let the consumer read + skip the duplicate

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(await prisma.notification.count({ where: { correlationId: cid } })).toBe(1);
    expect(await prisma.processedEvent.count({ where: { correlationId: cid } })).toBe(1);
  });

  it('RETRY → DEAD-LETTER: a permanently-failing handler is retried then dropped after maxAttempts', async () => {
    const sender: EmailSender = { send: jest.fn(async () => { throw new Error('SMTP unavailable'); }) };
    consumer = makeConsumer(sender, { maxAttempts: 1, reclaimIdleMs: 100, blockMs: 100 });
    await consumer.onApplicationBootstrap();

    const cid = randomUUID();
    await publish(EVENTS.quotationRequested, { quotationId: 'q-fail', email: 'fail@example.com' }, cid);

    // Wait until the message is dead-lettered — i.e. no longer in the group's pending list.
    const streamKey = 'stream:quotation.requested';
    await waitFor(
      async () => {
        const summary = (await bus.xpending(streamKey, GROUP)) as unknown as [number, ...unknown[]];
        return Number(summary[0]) === 0 ? true : null;
      },
      { timeoutMs: 20000, intervalMs: 150 },
    );

    const finalSummary = (await bus.xpending(streamKey, GROUP)) as unknown as [number, ...unknown[]];
    expect(Number(finalSummary[0])).toBe(0); // dead-lettered → drained from the PEL
    expect((sender.send as jest.Mock).mock.calls.length).toBeGreaterThan(1); // retried, not one-shot
    expect(await repo.isProcessed(cid)).toBe(false); // never succeeded → not marked processed
    // each failed attempt persisted a 'failed' Notification row
    const failed = await prisma.notification.count({ where: { correlationId: cid, status: 'failed' } });
    expect(failed).toBeGreaterThanOrEqual(1);
  });
});
