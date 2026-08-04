/**
 * POST /api/admin/session/login — admin login proxy (ADR-005).
 * Exchanges email/password with the gateway, then re-homes the tokens as our own httpOnly cookies.
 * The access token is never returned to the client; only the display identity {email, role} is.
 * A successfully-authenticated `visitor` is rejected here (no admin session established).
 */
import { NextResponse } from 'next/server';
import { loginSchema } from '@fardeen/types';
import { gatewayLogin } from '../../../../../lib/admin/gateway';
import { setSessionCookies } from '../../../../../lib/admin/cookies';
import { decodeClaims, isAdminRole } from '../../../../../lib/admin/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message }, meta: { requestId: 'admin-login' } }, { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON body');
  }
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Enter a valid email and password');
  }

  const result = await gatewayLogin(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    // Surface the gateway's status/code (401 invalid creds, 429 rate-limited, …).
    return errorResponse(result.error.status || 502, result.error.code, result.error.message);
  }

  const claims = decodeClaims(result.value.accessToken);
  if (!claims || !isAdminRole(claims.role)) {
    // Valid credentials but no admin access — do not establish a session.
    return errorResponse(403, 'FORBIDDEN', 'This account does not have admin access');
  }

  const res = NextResponse.json({ data: { user: { email: claims.email, role: claims.role } }, meta: { requestId: 'admin-login' } });
  setSessionCookies(res, result.value.accessToken, result.value.refreshToken);
  return res;
}
