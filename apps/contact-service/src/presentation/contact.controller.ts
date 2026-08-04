import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CONTACT_PATTERNS,
  type ListContactsPayload,
  type SetContactStatusPayload,
  type SubmitContactPayload,
} from '@fardeen/types';
import { ListContacts } from '../application/use-cases/list-contacts.use-case';
import { SetContactStatus } from '../application/use-cases/set-contact-status.use-case';
import { SubmitContact } from '../application/use-cases/submit-contact.use-case';

@Controller()
export class ContactController {
  constructor(
    private readonly submitContact: SubmitContact,
    private readonly listContacts: ListContacts,
    private readonly setContactStatus: SetContactStatus,
  ) {}

  @MessagePattern(CONTACT_PATTERNS.submit)
  submit(@Payload() payload: SubmitContactPayload) {
    return this.submitContact.execute(payload);
  }

  @MessagePattern(CONTACT_PATTERNS.list)
  list(@Payload() payload: ListContactsPayload) {
    return this.listContacts.execute(payload);
  }

  @MessagePattern(CONTACT_PATTERNS.setStatus)
  setStatus(@Payload() payload: SetContactStatusPayload) {
    return this.setContactStatus.execute(payload);
  }
}
