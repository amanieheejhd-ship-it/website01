import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { GetMe } from './get-me.use-case';

const makeUsers = (): jest.Mocked<UserRepository> => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn(),
  save: jest.fn(),
});

describe('GetMe use-case', () => {
  it('returns the profile when the user exists', async () => {
    const users = makeUsers();
    users.findById.mockResolvedValue(
      User.register({
        id: 'u1',
        email: Email.create('user@example.com'),
        passwordHash: 'hash',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    const result = await new GetMe(users).execute({ userId: 'u1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('u1');
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.createdAt).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  it('returns USER_NOT_FOUND when the user is missing', async () => {
    const users = makeUsers();
    users.findById.mockResolvedValue(null);
    const result = await new GetMe(users).execute({ userId: 'ghost' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('USER_NOT_FOUND');
  });
});
