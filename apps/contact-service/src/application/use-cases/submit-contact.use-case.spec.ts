jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomUUID: jest.fn(() => 'fixed-uuid-0001'),
}));

import type { SubmitContactPayload } from '@fardeen/types';
import { ContactSubmission } from '../../domain/entities/contact-submission.entity';
import type { ContactRepository } from '../../domain/repositories/contact.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { Phone } from '../../domain/value-objects/phone.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { SubmitContact } from './submit-contact.use-case';

const FIXED_NOW = new Date('2026-08-04T12:00:00.000Z');

const makeRepo = (): jest.Mocked<ContactRepository> => ({
  findByIdempotencyKey: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  list: jest.fn(),
});

const makeEvents = (): jest.Mocked<EventPublisher> => ({ publish: jest.fn() });

const basePayload = (over: Partial<SubmitContactPayload> = {}): SubmitContactPayload => ({
  name: 'Jane',
  email: 'Jane@Example.COM',
  phone: '+1 (555) 123-4567',
  subject: 'Quote please',
  message: 'Hello there',
  idempotencyKey: 'idem-1',
  correlationId: 'corr-1',
  ...over,
});

describe('SubmitContact use-case', () => {
  let repo: jest.Mocked<ContactRepository>;
  let events: jest.Mocked<EventPublisher>;
  let useCase: SubmitContact;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW);
    repo = makeRepo();
    events = makeEvents();
    useCase = new SubmitContact(repo, events);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves a new submission and emits the contact.submitted event', async () => {
    repo.findByIdempotencyKey.mockResolvedValue(null);

    const result = await useCase.execute(basePayload());

    expect(result.ok).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0] as ContactSubmission;
    expect(saved).toBeInstanceOf(ContactSubmission);
    expect(saved.id).toBe('fixed-uuid-0001');
    expect(saved.email.value).toBe('jane@example.com');
    expect(saved.phone.value).toBe('+15551234567');
    expect(saved.source).toBe('website');
    expect(saved.status).toBe('new');
    expect(saved.createdAt.toISOString()).toBe(FIXED_NOW.toISOString());

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith({
      name: 'contact.submitted',
      correlationId: 'corr-1',
      data: { contactId: 'fixed-uuid-0001', email: 'jane@example.com', subject: 'Quote please' },
    });

    if (result.ok) {
      expect(result.data).toEqual({
        id: 'fixed-uuid-0001',
        name: 'Jane',
        email: 'jane@example.com',
        phone: '+15551234567',
        subject: 'Quote please',
        message: 'Hello there',
        source: 'website',
        status: 'new',
        createdAt: FIXED_NOW.toISOString(),
      });
    }
  });

  it('honours an explicit source override', async () => {
    repo.findByIdempotencyKey.mockResolvedValue(null);
    await useCase.execute(basePayload({ source: 'landing-page' }));
    const saved = repo.save.mock.calls[0][0] as ContactSubmission;
    expect(saved.source).toBe('landing-page');
  });

  it('is idempotent: a duplicate key returns the existing submission without saving or emitting', async () => {
    const existing = ContactSubmission.create({
      id: 'existing-id',
      name: 'Prior',
      email: Email.create('prior@example.com'),
      phone: Phone.create('+15550000000'),
      subject: 'Prior subject',
      message: 'Prior message',
      source: 'website',
      idempotencyKey: 'idem-1',
      status: 'read',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    repo.findByIdempotencyKey.mockResolvedValue(existing);

    const result = await useCase.execute(basePayload());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('existing-id');
      expect(result.data.email).toBe('prior@example.com');
      expect(result.data.status).toBe('read');
    }
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('returns a VALIDATION_ERROR result for a malformed email (no save/emit)', async () => {
    repo.findByIdempotencyKey.mockResolvedValue(null);

    const result = await useCase.execute(basePayload({ email: 'not-an-email' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('rethrows non-domain errors (unexpected failures bubble to a 5xx)', async () => {
    repo.findByIdempotencyKey.mockRejectedValue(new Error('db down'));
    await expect(useCase.execute(basePayload())).rejects.toThrow('db down');
  });
});
