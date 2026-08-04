/**
 * Admin route gate (ADR-005). Presence check only — the authoritative role check runs server-side
 * in the (panel) layout, and every data mutation is RBAC-enforced by the gateway. Here we just keep
 * unauthenticated users out of the panel and bounce authenticated users away from the login page.
 */
import { NextResponse, type NextRequest } from 'next/server';

const AT_COOKIE = 'fardeen_admin_at';
const RT_COOKIE = 'fardeen_admin_rt';
const LOGIN_PATH = '/admin/login';

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(AT_COOKIE)?.value || req.cookies.get(RT_COOKIE)?.value);

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL(LOGIN_PATH, req.url);
    if (pathname !== '/admin') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Gate the whole /admin/* surface. The /api/admin/* handlers do their own token handling.
  matcher: ['/admin/:path*'],
};
