import { type ContactSubmissionDto, type ListContactsPayload, ok, type Result } from '@fardeen/types';
import type { ContactRepository } from '../../domain/repositories/contact.repository';
import { toContactDto } from '../mappers/contact.mapper';

export interface ContactListResult {
  items: ContactSubmissionDto[];
  page: number;
  limit: number;
  total: number;
}

/** Admin triage list (gateway route arrives in Phase 7). */
export class ListContacts {
  constructor(private readonly repo: ContactRepository) {}

  async execute(payload: ListContactsPayload): Promise<Result<ContactListResult>> {
    const page = payload.page ?? 1;
    const limit = payload.limit ?? 20;
    const { items, total } = await this.repo.list({ status: payload.status, page, limit });
    return ok({ items: items.map(toContactDto), page, limit, total });
  }
}
