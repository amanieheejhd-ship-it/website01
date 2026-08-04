export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Outbound email port. The Nodemailer adapter sets the From + transport (Maildev in dev). */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
