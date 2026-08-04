import { ForbiddenError } from '@fardeen/shared';
import { Email } from '../value-objects/email.vo';
import { User } from './user.entity';

const email = Email.create('user@example.com');
const activeUser = () =>
  User.register({ id: 'u1', email, passwordHash: 'hash', createdAt: new Date('2026-01-01T00:00:00Z') });

describe('User entity', () => {
  describe('register factory', () => {
    it('creates an active user and defaults the role to visitor', () => {
      const user = activeUser();
      expect(user.id).toBe('u1');
      expect(user.email.value).toBe('user@example.com');
      expect(user.passwordHash).toBe('hash');
      expect(user.role).toBe('visitor');
      expect(user.status).toBe('active');
      expect(user.isActive()).toBe(true);
      expect(user.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
    });

    it('honours an explicit role', () => {
      const user = User.register({
        id: 'u2',
        email,
        passwordHash: 'hash',
        role: 'admin',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      expect(user.role).toBe('admin');
    });
  });

  describe('rehydrate factory', () => {
    it('reconstructs an entity from persisted props', () => {
      const user = User.rehydrate({
        id: 'u3',
        email,
        passwordHash: 'hash',
        role: 'editor',
        status: 'inactive',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      expect(user.id).toBe('u3');
      expect(user.role).toBe('editor');
      expect(user.status).toBe('inactive');
      expect(user.isActive()).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('delegates to the comparator for an active user', async () => {
      const compare = jest.fn().mockResolvedValue(true);
      const user = activeUser();
      await expect(user.verifyPassword('plain', compare)).resolves.toBe(true);
      expect(compare).toHaveBeenCalledWith('plain', 'hash');
    });

    it('returns false (without calling the comparator) when the user is inactive', async () => {
      const compare = jest.fn().mockResolvedValue(true);
      const user = User.rehydrate({
        id: 'u4',
        email,
        passwordHash: 'hash',
        role: 'visitor',
        status: 'inactive',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      await expect(user.verifyPassword('plain', compare)).resolves.toBe(false);
      expect(compare).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    it('updates the role of an active user', () => {
      const user = activeUser();
      user.changeRole('admin');
      expect(user.role).toBe('admin');
    });

    it('throws ForbiddenError when the user is inactive', () => {
      const user = activeUser();
      user.deactivate();
      expect(user.isActive()).toBe(false);
      expect(() => user.changeRole('admin')).toThrow(ForbiddenError);
      expect(user.role).toBe('visitor');
    });
  });
});
