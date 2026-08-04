import { z } from 'zod';

/**
 * Identity & Access contracts (docs/DOMAIN-MODEL.md §Identity). Shared by the gateway (REST edge)
 * and auth-service (TCP handlers). Every message return rides the Result<T> envelope.
 */

export type Role = 'admin' | 'editor' | 'visitor';
export const ROLES = ['admin', 'editor', 'visitor'] as const;
export type UserStatus = 'active' | 'inactive';

// ---- Inbound DTOs + Zod schemas (validated at the gateway edge) ----
export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'editor', 'visitor']).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof loginSchema>;

// ---- Read models ----
export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface AccessToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // seconds
}

/** RS256 access-token claims — the gateway verifies these locally with the public key. */
export interface AccessTokenClaims {
  sub: string; // user id
  email: string;
  role: Role;
  type: 'access';
}

// ---- TCP message payloads / returns (each handler returns Result<T>) ----
export interface RegisterPayload {
  email: string;
  password: string;
  role?: Role;
  correlationId?: string;
}
export interface LoginPayload {
  email: string;
  password: string;
  userAgent?: string;
  correlationId?: string;
}
export interface LoginResult {
  access: AccessToken;
  refreshToken: string; // opaque; the gateway sets it as an httpOnly cookie
  profile: UserProfile;
}
export interface RefreshPayload {
  refreshToken: string;
  userAgent?: string;
  correlationId?: string;
}
export interface RefreshResult {
  access: AccessToken;
  refreshToken: string;
}
export interface LogoutPayload {
  refreshToken: string;
}
export interface MePayload {
  userId: string;
}
