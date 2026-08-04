export interface RefreshSessionProps {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  userAgent?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
}

/**
 * RefreshSession entity (docs/DOMAIN-MODEL.md §Identity). Rotation + reuse-detection are
 * orchestrated by the RefreshToken use-case over the RefreshSessionStore port; this entity models
 * a single opaque, server-side session record (the raw token never leaves the client cookie —
 * only its hash is stored).
 */
export class RefreshSession {
  constructor(private props: RefreshSessionProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get familyId(): string {
    return this.props.familyId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  isActive(now: Date): boolean {
    return !this.props.revokedAt && this.props.expiresAt > now;
  }

  revoke(now: Date): void {
    if (!this.props.revokedAt) this.props.revokedAt = now;
  }
}
