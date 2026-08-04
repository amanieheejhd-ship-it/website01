/**
 * Helpers to set/clear the Next-owned admin session cookies on a route-handler response.
 * Both are httpOnly (never in client JS), Lax (sent on top-level nav to /admin and same-origin
 * /api/admin fetches), Secure in production. The access-token cookie is kept for the full session
 * lifetime so the server can decode its role claim for the gate even after the JWT's short API TTL
 * has elapsed — the proxy checks the `exp` claim and silently refreshes when needed.
 */
import type { NextResponse } from 'next/server';
import { AT_COOKIE, RT_COOKIE } from './session';

/** Session lifetime = the gateway refresh-token TTL (14 days). */
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

const baseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function setSessionCookies(res: NextResponse, accessToken: string, refreshToken: string | null): void {
  res.cookies.set(AT_COOKIE, accessToken, { ...baseOptions, maxAge: SESSION_MAX_AGE });
  if (refreshToken) {
    res.cookies.set(RT_COOKIE, refreshToken, { ...baseOptions, maxAge: SESSION_MAX_AGE });
  }
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(AT_COOKIE, '', { ...baseOptions, maxAge: 0 });
  res.cookies.set(RT_COOKIE, '', { ...baseOptions, maxAge: 0 });
}
