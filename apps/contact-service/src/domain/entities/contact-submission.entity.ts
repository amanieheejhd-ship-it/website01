import type { ContactStatus } from '@fardeen/types';
import type { Email } from '../value-objects/email.vo';
import type { Phone } from '../value-objects/phone.vo';

export interface ContactSubmissionProps {
  id: string;
  name: string;
  email: Email;
  phone: Phone;
  subject: string;
  message: string;
  source: string;
  idempotencyKey: string;
  status: ContactStatus;
  createdAt: Date;
}

/** ContactSubmission aggregate (docs/DOMAIN-MODEL.md §Contact). Duplicate idempotencyKey is a no-op
 *  (guarded by the SubmitContact use-case + a unique constraint). */
export class ContactSubmission {
  private constructor(private readonly props: ContactSubmissionProps) {}

  static create(props: ContactSubmissionProps): ContactSubmission {
    return new ContactSubmission(props);
  }
  static rehydrate(props: ContactSubmissionProps): ContactSubmission {
    return new ContactSubmission(props);
  }

  markRead(): void {
    if (this.props.status === 'new') this.props.status = 'read';
  }
  archive(): void {
    this.props.status = 'archived';
  }
  setStatus(status: ContactStatus): void {
    this.props.status = status;
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): Email {
    return this.props.email;
  }
  get phone(): Phone {
    return this.props.phone;
  }
  get subject(): string {
    return this.props.subject;
  }
  get message(): string {
    return this.props.message;
  }
  get source(): string {
    return this.props.source;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get status(): ContactStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
