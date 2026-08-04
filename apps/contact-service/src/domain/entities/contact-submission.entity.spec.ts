import type { ContactStatus } from '@fardeen/types';
import { Email } from '../value-objects/email.vo';
import { Phone } from '../value-objects/phone.vo';
import { CONTACT_REPOSITORY } from '../repositories/contact.repository';
import { ContactSubmission, type ContactSubmissionProps } from './contact-submission.entity';

const baseProps = (status: ContactStatus = 'new'): ContactSubmissionProps => ({
  id: 'id-1',
  name: 'Jane Doe',
  email: Email.create('jane@example.com'),
  phone: Phone.create('+15551234567'),
  subject: 'Hello',
  message: 'A message',
  source: 'website',
  idempotencyKey: 'idem-1',
  status,
  createdAt: new Date('2026-08-04T00:00:00.000Z'),
});

describe('ContactSubmission entity', () => {
  it('exposes all props through getters', () => {
    const s = ContactSubmission.create(baseProps());
    expect(s.id).toBe('id-1');
    expect(s.name).toBe('Jane Doe');
    expect(s.email.value).toBe('jane@example.com');
    expect(s.phone.value).toBe('+15551234567');
    expect(s.subject).toBe('Hello');
    expect(s.message).toBe('A message');
    expect(s.source).toBe('website');
    expect(s.idempotencyKey).toBe('idem-1');
    expect(s.status).toBe('new');
    expect(s.createdAt.toISOString()).toBe('2026-08-04T00:00:00.000Z');
  });

  it('rehydrate reconstructs an equivalent aggregate', () => {
    const s = ContactSubmission.rehydrate(baseProps('read'));
    expect(s.status).toBe('read');
    expect(s.id).toBe('id-1');
  });

  describe('status transitions', () => {
    it('markRead moves new -> read', () => {
      const s = ContactSubmission.create(baseProps('new'));
      s.markRead();
      expect(s.status).toBe('read');
    });

    it('markRead is a no-op once already read', () => {
      const s = ContactSubmission.create(baseProps('read'));
      s.markRead();
      expect(s.status).toBe('read');
    });

    it('markRead does not resurrect an archived submission', () => {
      const s = ContactSubmission.create(baseProps('archived'));
      s.markRead();
      expect(s.status).toBe('archived');
    });

    it('archive always moves to archived', () => {
      const s = ContactSubmission.create(baseProps('read'));
      s.archive();
      expect(s.status).toBe('archived');
    });

    it('setStatus overrides to any status', () => {
      const s = ContactSubmission.create(baseProps('new'));
      s.setStatus('archived');
      expect(s.status).toBe('archived');
      s.setStatus('read');
      expect(s.status).toBe('read');
    });
  });
});

describe('CONTACT_REPOSITORY token', () => {
  it('is a unique symbol', () => {
    expect(typeof CONTACT_REPOSITORY).toBe('symbol');
  });
});
