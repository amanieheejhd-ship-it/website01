import { type ContactSubmissionDto, err, ok, type Result, type SetContactStatusPayload } from '@fardeen/types';
import type { ContactRepository } from '../../domain/repositories/contact.repository';
import { toContactDto } from '../mappers/contact.mapper';

export class SetContactStatus {
  constructor(private readonly repo: ContactRepository) {}

  async execute(payload: SetContactStatusPayload): Promise<Result<ContactSubmissionDto>> {
    const submission = await this.repo.findById(payload.id);
    if (!submission) {
      return err({ code: 'CONTACT_NOT_FOUND', message: 'Contact submission not found' });
    }
    submission.setStatus(payload.status);
    await this.repo.save(submission);
    return ok(toContactDto(submission));
  }
}
