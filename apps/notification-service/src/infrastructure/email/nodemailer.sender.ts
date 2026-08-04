import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailMessage, EmailSender } from '../../application/ports/email-sender.port';

export interface NodemailerConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
}

/** Nodemailer adapter — SMTP transport from config (Maildev in dev; swap host/port for prod). */
export class NodemailerEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(private readonly cfg: NodemailerConfig) {
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: false,
      auth: cfg.user ? { user: cfg.user, pass: cfg.password } : undefined,
      tls: { rejectUnauthorized: false },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.cfg.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
