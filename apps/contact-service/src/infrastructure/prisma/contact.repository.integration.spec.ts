/**
 * Integration — PrismaContactRepository + SubmitContact use-case against the REAL native
 * Postgres (contact_db_test). Proves the Prisma schema ↔ domain mapping, the unique
 * idempotency_key constraint, list() pagination/filter/ordering, and use-case idempotency.
 */
import { randomUUID } from 'node:crypto';
import type { ContactStatus, SubmitContactPayload } from '@fardeen/types';
import {
  ContactSubmission,
  type ContactSubmissionProps,
} from '../../domain/entities/contact-submission.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Phone } from '../../domain/value-objects/phone.vo';
import { SubmitContact } from '../../application/use-cases/submit-contact.use-case';
import type { EventPublisher } from '../../application/ports/event-publisher.port';
import { testDbUrl, truncate } from '../../../../../test/integration/support';
import { PrismaService } from './prisma.service';
import { PrismaContactRepository } from './contact.repository.impl';

function makeSubmission(
  over: Partial<Omit<ContactSubmissionProps, 'email' | 'phone'>> & {
    email?: string;
    phone?: string;
  } = {},
): ContactSubmission {
  const { email, phone, ...rest } = over;
  const props: ContactSubmissionProps = {
    id: randomUUID(),
    name: 'Ada Lovelace',
    email: Email.create(email ?? 'ada@example.com'),
    phone: Phone.create(phone ?? '+91 98765 43210'),
    subject: 'Kitchen remodel',
    message: 'Please call me about the renovation.',
    source: 'website',
    idempotencyKey: randomUUID(),
    status: 'new' as ContactStatus,
    createdAt: new Date(),
    ...rest,
  };
  return ContactSubmission.create(props);
}

describe('PrismaContactRepository (integration · real Postgres contact_db_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaContactRepository;

  beforeAll(async () => {
    prisma = new PrismaService(testDbUrl('contact_db_test'));
    await prisma.$connect();
    repo = new PrismaContactRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncate(prisma.$executeRawUnsafe.bind(prisma), ['contact_submissions']);
  });

  it('round-trips a submission and reconstructs the domain aggregate faithfully', async () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const s = makeSubmission({
      name: 'Grace Hopper',
      email: 'Grace.Hopper@Example.COM',
      phone: '+1 (415) 555-0199',
      subject: 'Office fit-out',
      message: 'We need a quote for 4,200 sq ft.',
      source: 'referral',
      status: 'read' as ContactStatus,
      createdAt,
    });
    await repo.save(s);

    const found = await repo.findById(s.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(s.id);
    expect(found!.name).toBe('Grace Hopper');
    // Email VO normalizes to trimmed lowercase
    expect(found!.email.value).toBe('grace.hopper@example.com');
    // Phone VO strips punctuation, keeps digits + leading '+'
    expect(found!.phone.value).toBe('+14155550199');
    expect(found!.subject).toBe('Office fit-out');
    expect(found!.message).toBe('We need a quote for 4,200 sq ft.');
    expect(found!.source).toBe('referral');
    expect(found!.status).toBe('read');
    expect(found!.createdAt.toISOString()).toBe(createdAt.toISOString());

    // findByIdempotencyKey resolves the same aggregate
    const byKey = await repo.findByIdempotencyKey(s.idempotencyKey);
    expect(byKey).not.toBeNull();
    expect(byKey!.id).toBe(s.id);
  });

  it('enforces the unique idempotency_key constraint at the database', async () => {
    const key = randomUUID();
    await repo.save(makeSubmission({ idempotencyKey: key }));
    // a DIFFERENT id but the SAME idempotencyKey must violate the DB unique index (Prisma P2002)
    await expect(repo.save(makeSubmission({ idempotencyKey: key }))).rejects.toThrow();
  });

  it('list() paginates, filters by status, and orders by createdAt desc', async () => {
    await repo.save(
      makeSubmission({ subject: 'oldest', createdAt: new Date('2026-01-01T00:00:00.000Z') }),
    );
    await repo.save(
      makeSubmission({ subject: 'middle', createdAt: new Date('2026-01-02T00:00:00.000Z') }),
    );
    await repo.save(
      makeSubmission({ subject: 'newest', createdAt: new Date('2026-01-03T00:00:00.000Z') }),
    );
    await repo.save(
      makeSubmission({
        subject: 'archived-one',
        status: 'archived' as ContactStatus,
        createdAt: new Date('2026-01-04T00:00:00.000Z'),
      }),
    );

    // Unfiltered: total counts all rows, page 1 honors limit, ordered newest-first.
    const page1 = await repo.list({ page: 1, limit: 2 });
    expect(page1.total).toBe(4);
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0].subject).toBe('archived-one');
    expect(page1.items[1].subject).toBe('newest');

    const page2 = await repo.list({ page: 2, limit: 2 });
    expect(page2.total).toBe(4);
    expect(page2.items).toHaveLength(2);
    expect(page2.items.map((i) => i.subject)).toEqual(['middle', 'oldest']);

    // Status filter narrows the total to the matching subset.
    const newOnly = await repo.list({ status: 'new' as ContactStatus, page: 1, limit: 10 });
    expect(newOnly.total).toBe(3);
    expect(newOnly.items.every((i) => i.status === 'new')).toBe(true);

    const archivedOnly = await repo.list({
      status: 'archived' as ContactStatus,
      page: 1,
      limit: 10,
    });
    expect(archivedOnly.total).toBe(1);
    expect(archivedOnly.items[0].subject).toBe('archived-one');
  });

  describe('SubmitContact use-case (real repo · mocked EventPublisher)', () => {
    const basePayload = (idempotencyKey: string): SubmitContactPayload => ({
      name: 'Katherine Johnson',
      email: 'katherine@example.com',
      phone: '+1 202 555 0100',
      subject: 'Roof inspection',
      message: 'Requesting a site visit next week.',
      source: 'website',
      idempotencyKey,
      correlationId: 'corr-123',
    });

    it('is idempotent: a duplicate key returns the same id without re-saving or re-publishing', async () => {
      const events: EventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
      const useCase = new SubmitContact(repo, events);
      const key = randomUUID();

      const first = await useCase.execute(basePayload(key));
      expect(first.ok).toBe(true);
      const firstId = first.ok ? first.data.id : undefined;
      expect(firstId).toBeDefined();
      expect(events.publish).toHaveBeenCalledTimes(1);
      expect((await repo.list({ page: 1, limit: 10 })).total).toBe(1);

      // Second submit with the SAME idempotencyKey → no-op double-submit guard.
      const second = await useCase.execute(basePayload(key));
      expect(second.ok).toBe(true);
      const secondId = second.ok ? second.data.id : undefined;
      expect(secondId).toBe(firstId);
      // No duplicate row persisted, publisher NOT called a second time.
      expect((await repo.list({ page: 1, limit: 10 })).total).toBe(1);
      expect(events.publish).toHaveBeenCalledTimes(1);
    });
  });
});
