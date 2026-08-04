import { ContactSubmission } from '../../domain/entities/contact-submission.entity';
import type { ContactRepository } from '../../domain/repositories/contact.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { Phone } from '../../domain/value-objects/phone.vo';
import { ListContacts } from './list-contacts.use-case';

const makeRepo = (): jest.Mocked<ContactRepository> => ({
  findByIdempotencyKey: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  list: jest.fn(),
});

const makeSubmission = (id: string) =>
  ContactSubmission.create({
    id,
    name: 'Jane',
    email: Email.create('jane@example.com'),
    phone: Phone.create('+15551234567'),
    subject: 'Hi',
    message: 'Msg',
    source: 'website',
    idempotencyKey: `idem-${id}`,
    status: 'new',
    createdAt: new Date('2026-08-04T00:00:00.000Z'),
  });

describe('ListContacts use-case', () => {
  let repo: jest.Mocked<ContactRepository>;
  let useCase: ListContacts;

  beforeEach(() => {
    repo = makeRepo();
    useCase = new ListContacts(repo);
  });

  it('applies default pagination and maps items to DTOs', async () => {
    repo.list.mockResolvedValue({ items: [makeSubmission('a'), makeSubmission('b')], total: 2 });

    const result = await useCase.execute({});

    expect(repo.list).toHaveBeenCalledWith({ status: undefined, page: 1, limit: 20 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.total).toBe(2);
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0]).toMatchObject({ id: 'a', email: 'jane@example.com', status: 'new' });
    }
  });

  it('passes explicit filter, page and limit through to the repository', async () => {
    repo.list.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ status: 'archived', page: 3, limit: 5 });

    expect(repo.list).toHaveBeenCalledWith({ status: 'archived', page: 3, limit: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ items: [], page: 3, limit: 5, total: 0 });
    }
  });
});
