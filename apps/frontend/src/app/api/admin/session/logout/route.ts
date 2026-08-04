/**
 * POST /api/admin/session/logout — best-effort gateway revoke + clears our session cookies.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { gatewayLogout } from '../../../../../lib/admin/gateway';
import { clearSessionCookies } from '../../../../../lib/admin/cookies';
import { RT_COOKIE } from '../../../../../lib/admin/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  const store = await cookies();
  await gatewayLogout(store.get(RT_COOKIE)?.value);
  const res = NextResponse.json({ data: { ok: true }, meta: { requestId: 'admin-logout' } });
  clearSessionCookies(res);
  return res;
}
