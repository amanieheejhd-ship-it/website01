export const REFRESH_SESSION_STORE = Symbol('REFRESH_SESSION_STORE');

export interface RefreshRecord {
  userId: string;
  familyId: string;
  active: boolean;
  expiresAt: Date;
}

export interface IssuedRefresh {
  token: string; // opaque, returned to the client (cookie); only its hash is stored server-side
  familyId: string;
  expiresAt: Date;
}

/**
 * Server-side refresh-session store (Redis adapter). Primitives only — rotation + reuse-detection
 * policy lives in the RefreshToken use-case.
 */
export interface RefreshSessionStore {
  issue(input: { userId: string; familyId?: string; userAgent?: string }): Promise<IssuedRefresh>;
  get(token: string): Promise<RefreshRecord | null>;
  markRotated(token: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
}
