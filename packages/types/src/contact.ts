import { z } from 'zod';

/** Contact contracts — contact-service owns contact_db (docs/DOMAIN-MODEL.md §Contact). */

export type ContactStatus = 'new' | 'read' | 'archived';

export interface ContactSubmissionDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: string;
  status: ContactStatus;
  createdAt: string;
}

export const submitContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  phone: z.string().min(5).max(24),
  subject: z.string().min(1).max(160),
  message: z.string().min(1).max(4000),
  source: z.string().max(60).optional(),
});
export type SubmitContactInput = z.infer<typeof submitContactSchema>;

export interface SubmitContactPayload extends SubmitContactInput {
  idempotencyKey: string;
  correlationId?: string;
}
export interface ListContactsPayload {
  status?: ContactStatus;
  page?: number;
  limit?: number;
}
export interface SetContactStatusPayload {
  id: string;
  status: ContactStatus;
}

export interface ContactSubmittedData {
  contactId: string;
  email: string;
  subject: string;
}
