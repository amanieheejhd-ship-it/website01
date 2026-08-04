import type { UserRepository } from '../../domain/repositories/user.repository';
import type { PasswordHasher } from '../ports/password-hasher.port';
import type { EventPublisher } from '../ports/event-publisher.port';
import { RegisterUser } from './register-user.use-case';

const makeMocks = () => {
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const hasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn().mockResolvedValue('hashed-pw'),
    compare: jest.fn(),
  };
  const events: jest.Mocked<EventPublisher> = { publish: jest.fn().mockResolvedValue(undefined) };
  return { users, hasher, events };
};

describe('RegisterUser use-case', () => {
  it('returns EMAIL_TAKEN and does not persist/emit when the email already exists', async () => {
    const { users, hasher, events } = makeMocks();
    users.existsByEmail.mockResolvedValue(true);
    const result = await new RegisterUser(users, hasher, events).execute({
      email: 'taken@example.com',
      password: 'password123',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('EMAIL_TAKEN');
    expect(users.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
  });

  it('on success hashes, saves the user, and emits user.registered', async () => {
    const { users, hasher, events } = makeMocks();
    users.existsByEmail.mockResolvedValue(false);
    const result = await new RegisterUser(users, hasher, events).execute({
      email: '  New.User@Example.COM ',
      password: 'password123',
      role: 'editor',
      correlationId: 'corr-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe('new.user@example.com');
      expect(result.data.role).toBe('editor');
      expect(result.data.status).toBe('active');
    }

    expect(hasher.hash).toHaveBeenCalledWith('password123');
    expect(users.save).toHaveBeenCalledTimes(1);
    const savedUser = users.save.mock.calls[0][0];
    expect(savedUser.email.value).toBe('new.user@example.com');
    expect(savedUser.passwordHash).toBe('hashed-pw');

    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'user.registered',
        correlationId: 'corr-1',
        data: expect.objectContaining({ email: 'new.user@example.com', role: 'editor' }),
      }),
    );
  });

  it('maps a domain ValidationError (bad email) to a Result error', async () => {
    const { users, hasher, events } = makeMocks();
    const result = await new RegisterUser(users, hasher, events).execute({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(users.existsByEmail).not.toHaveBeenCalled();
  });

  it('rethrows unexpected (non-domain) errors from a port', async () => {
    const { users, hasher, events } = makeMocks();
    users.existsByEmail.mockResolvedValue(false);
    hasher.hash.mockRejectedValue(new Error('kms down'));
    await expect(
      new RegisterUser(users, hasher, events).execute({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrow('kms down');
  });
});
