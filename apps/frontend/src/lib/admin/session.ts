/**
 * Server-only admin session helpers (ADR-005).
 *
 * The admin session lives entirely in httpOnly cookies set by our own Next route handlers — the
 * access token is NEVER exposed to client JS. These helpers read/decode those cookies on the server
 * (middleware, the (admin) layout role-gate, the proxy). We decode the JWT payload WITHOUT verifying
 * its signature: the token was minted by the gateway during a verified login and stored in an
 * httpOnly cookie by our server, and every real data call is re-verified + RBAC-checked by the
 * gateway. Decoding here only drives routing/role-gating (defence-in-depth), never authorization.
 */
import type { Role } from '@fardeen/types';

/** Next-owned httpOnly cookies (distinct from the gateway's own `fardeen_rt` at Path=/api/v1/auth). */
export const AT_COOKIE = 'fardeen_admin_at';
export const RT_COOKIE = 'fardeen_admin_rt';

/** Roles allowed to reach the (admin) group at all. `visitor` is rejected. */
export const ADMIN_ROLES: readonly Role[] = ['admin', 'editor'];

export interface AdminClaims {
  sub: string;
  email: string;
  role: Role;
  /** Unix seconds. */
  exp: number;
}

function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  // Buffer exists in the Node runtime (route handlers/layout); atob exists on the edge (middleware).
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
  return atob(b64);
}

/** Decode a JWT's claims without signature verification. Returns null if malformed. */
export function decodeClaims(token: string | undefined | null): AdminClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(b64urlDecode(parts[1])) as Record<string, unknown>;
    const sub = payload.sub;
    const email = payload.email;
    const role = payload.role;
    const exp = payload.exp;
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof role !== 'string' || typeof exp !== 'number') {
      return null;
    }
    return { sub, email, role: role as Role, exp };
  } catch {
    return null;
  }
}

/** True when the access token is expired (or within `skewSeconds` of expiring). */
export function isExpired(claims: AdminClaims, skewSeconds = 30): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  return claims.exp - skewSeconds <= nowSec;
}

export function isAdminRole(role: Role | undefined): boolean {
  return role !== undefined && ADMIN_ROLES.includes(role);
}
