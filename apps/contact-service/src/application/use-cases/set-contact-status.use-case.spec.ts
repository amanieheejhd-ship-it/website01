import { ContactSubmission } from '../../domain/entities/contact-submission.entity';
import type { ContactRepository } from '../../domain/repositories/contact.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { Phone } from '../../domain/value-objects/phone.vo';
import { EVENT_PUBLISHER } from '../ports/event-publisher.port';
import { SetContactStatus } from './set-contact-status.use-case';

const makeRepo = (): jest.Mocked<ContactRepository> => ({
  findByIdempotencyKey: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  list: jest.fn(),
});

const makeSubmission = () =>
  ContactSubmission.create({
    id: 'id-1',
    name: 'Jane',
    email: Email.create('jane@example.com'),
    phone: Phone.create('+15551234567'),
    subject: 'Hi',
    message: 'Msg',
    source: 'website',
    idempotencyKey: 'idem-1',
    status: 'new',
    createdAt: new Date('2026-08-04T00:00:00.000Z'),
  });

describe('SetContactStatus use-case', () => {
  let repo: jest.Mocked<ContactRepository>;
  let useCase: SetContactStatus;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new SetContactStatus(repo);
  });

  it('updates status and persists the submission', async () => {
    const submission = makeSubmission();
    repo.findById.mockResolvedValue(submission);

    const result = await useCase.execute({ id: 'id-1', status: 'read' });

    expect(repo.findById).toHaveBeenCalledWith('id-1');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(submission);
    expect(submission.status).toBe('read');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('read');
      expect(result.data.id).toBe('id-1');
    }
  });

  it('returns CONTACT_NOT_FOUND when the submission is missing', async () => {
    repo.findById.mockResolvedValue(null);

    const result = await useCase.execute({ id: 'missing', status: 'archived' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONTACT_NOT_FOUND');
    }
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe('EVENT_PUBLISHER token', () => {
  it('is a unique symbol', () => {
    expect(typeof EVENT_PUBLISHER).toBe('symbol');
  });
});
