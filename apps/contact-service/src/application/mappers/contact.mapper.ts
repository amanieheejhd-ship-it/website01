import type { ContactSubmissionDto } from '@fardeen/types';
import type { ContactSubmission } from '../../domain/entities/contact-submission.entity';

export function toContactDto(s: ContactSubmission): ContactSubmissionDto {
  return {
    id: s.id,
    name: s.name,
    email: s.email.value,
    phone: s.phone.value,
    subject: s.subject,
    message: s.message,
    source: s.source,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  };
}
