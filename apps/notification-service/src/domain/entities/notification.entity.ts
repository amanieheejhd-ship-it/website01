export type NotificationChannel = 'email' | 'webhook';
export type NotificationStatus = 'queued' | 'sent' | 'failed';

export interface NotificationProps {
  id: string;
  channel: NotificationChannel;
  template: string;
  to: string;
  payload: unknown;
  status: NotificationStatus;
  attempts: number;
  correlationId: string;
  createdAt: Date;
}

/** Notification aggregate (docs/DOMAIN-MODEL.md §Notifications). Idempotent on correlationId at the
 *  application layer; this entity owns its own delivery state transitions. */
export class Notification {
  private constructor(private readonly props: NotificationProps) {}

  static create(input: {
    id: string;
    channel: NotificationChannel;
    template: string;
    to: string;
    payload: unknown;
    correlationId: string;
    createdAt: Date;
  }): Notification {
    return new Notification({ ...input, status: 'queued', attempts: 0 });
  }
  static rehydrate(props: NotificationProps): Notification {
    return new Notification({ ...props });
  }

  incrementAttempt(): void {
    this.props.attempts += 1;
  }
  markSent(): void {
    this.props.status = 'sent';
  }
  markFailed(): void {
    this.props.status = 'failed';
  }

  get id(): string {
    return this.props.id;
  }
  get channel(): NotificationChannel {
    return this.props.channel;
  }
  get template(): string {
    return this.props.template;
  }
  get to(): string {
    return this.props.to;
  }
  get payload(): unknown {
    return this.props.payload;
  }
  get status(): NotificationStatus {
    return this.props.status;
  }
  get attempts(): number {
    return this.props.attempts;
  }
  get correlationId(): string {
    return this.props.correlationId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
