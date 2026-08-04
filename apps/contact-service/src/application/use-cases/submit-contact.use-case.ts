import { randomUUID } from 'node:crypto';
import {
  type ContactSubmissionDto,
  EVENTS,
  ok,
  type Result,
  type SubmitContactPayload,
} from '@fardeen/types';
import { ContactSubmission } from '../../domain/entities/contact-submission.entity';
import type { ContactRepository } from '../../domain/repositories/contact.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { Phone } from '../../domain/value-objects/phone.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { toContactDto } from '../mappers/contact.mapper';
import { toErr } from '../result.util';

/** Double-submit guard: a duplicate idempotencyKey returns the existing submission (no-op). */
export class SubmitContact {
  constructor(
    private readonly repo: ContactRepository,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: SubmitContactPayload): Promise<Result<ContactSubmissionDto>> {
    try {
      const existing = await this.repo.findByIdempotencyKey(payload.idempotencyKey);
      if (existing) {
        return ok(toContactDto(existing));
      }
      const submission = ContactSubmission.create({
        id: randomUUID(),
        name: payload.name,
        email: Email.create(payload.email),
        phone: Phone.create(payload.phone),
        subject: payload.subject,
        message: payload.message,
        source: payload.source ?? 'website',
        idempotencyKey: payload.idempotencyKey,
        status: 'new',
        createdAt: new Date(),
      });
      await this.repo.save(submission);
      await this.events.publish({
        name: EVENTS.contactSubmitted,
        correlationId: payload.correlationId,
        data: { contactId: submission.id, email: submission.email.value, subject: submission.subject },
      });
      return ok(toContactDto(submission));
    } catch (e) {
      return toErr(e);
    }
  }
}
