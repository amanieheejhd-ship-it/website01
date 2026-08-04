import type { ContactStatus } from '@fardeen/types';
import type { ContactSubmission } from '../entities/contact-submission.entity';

export const CONTACT_REPOSITORY = Symbol('CONTACT_REPOSITORY');

export interface ContactRepository {
  findByIdempotencyKey(key: string): Promise<ContactSubmission | null>;
  findById(id: string): Promise<ContactSubmission | null>;
  save(submission: ContactSubmission): Promise<void>;
  list(filter: { status?: ContactStatus; page: number; limit: number }): Promise<{
    items: ContactSubmission[];
    total: number;
  }>;
}
