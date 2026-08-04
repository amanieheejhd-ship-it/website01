/**
 * /api/admin/[...path] — same-origin proxy to the gateway BFF (ADR-005, guardrail: admin UI talks
 * ONLY to /api/v1/admin/*).
 *
 * The browser calls this handler; it attaches the Bearer access token from an httpOnly cookie,
 * transparently refreshes on a 401 using the refresh cookie (rotating both), and returns the
 * gateway's JSON envelope verbatim. Tokens never touch client JS. The path is hard-scoped under
 * `/admin/` and every segment is validated so it cannot be walked back into `/auth` or a service.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callAdmin, gatewayRefresh } from '../../../../lib/admin/gateway';
import { setSessionCookies, clearSessionCookies } from '../../../../lib/admin/cookies';
import { AT_COOKIE, RT_COOKIE, decodeClaims, isExpired } from '../../../../lib/admin/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ path?: string[] }>;
}

function unauthorized() {
  const res = NextResponse.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Your session has expired. Please sign in again.' }, meta: { requestId: 'admin-proxy' } },
    { status: 401 },
  );
  clearSessionCookies(res);
  return res;
}

/** Reject traversal / empty segments so the target can only ever be under /admin/. */
function safeAdminPath(segments: string[] | undefined): string | null {
  if (!segments || segments.length === 0) return null;
  for (const s of segments) {
    if (!s || s === '.' || s === '..' || s.includes('/') || s.includes('\\')) return null;
  }
  return segments.map(encodeURIComponent).join('/');
}

async function handle(req: Request, ctx: Ctx, method: string): Promise<NextResponse> {
  const { path } = await ctx.params;
  const adminPath = safeAdminPath(path);
  if (adminPath === null) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Unknown admin route' }, meta: { requestId: 'admin-proxy' } }, { status: 404 });
  }

  const store = await cookies();
  let accessToken = store.get(AT_COOKIE)?.value;
  const refreshToken = store.get(RT_COOKIE)?.value;
  if (!accessToken && !refreshToken) return unauthorized();

  const search = new URL(req.url).search;
  const body = method === 'POST' || method === 'PATCH' || method === 'PUT' ? await req.text() : undefined;

  // Refresh proactively if the current access token is missing or (about to be) expired.
  let rotated: { accessToken: string; refreshToken: string | null } | null = null;
  const claims = accessToken ? decodeClaims(accessToken) : null;
  if ((!accessToken || !claims || isExpired(claims)) && refreshToken) {
    const r = await gatewayRefresh(refreshToken);
    if (!r.ok) return unauthorized();
    rotated = r.value;
    accessToken = r.value.accessToken;
  }
  if (!accessToken) return unauthorized();

  let result = await callAdmin(method, adminPath, accessToken, { body, search });

  // Reactive refresh: token rejected (e.g. clock skew / rotation) → refresh once and retry.
  if (result.status === 401 && refreshToken && !rotated) {
    const r = await gatewayRefresh(refreshToken);
    if (!r.ok) return unauthorized();
    rotated = r.value;
    result = await callAdmin(method, adminPath, r.value.accessToken, { body, search });
  }

  const res = NextResponse.json(result.json ?? {}, { status: result.status || 502 });
  if (rotated) setSessionCookies(res, rotated.accessToken, rotated.refreshToken);
  return res;
}

export function GET(req: Request, ctx: Ctx) {
  return handle(req, ctx, 'GET');
}
export function POST(req: Request, ctx: Ctx) {
  return handle(req, ctx, 'POST');
}
export function PATCH(req: Request, ctx: Ctx) {
  return handle(req, ctx, 'PATCH');
}
export function DELETE(req: Request, ctx: Ctx) {
  return handle(req, ctx, 'DELETE');
}
