/**
 * Server-only gateway client for the admin session + BFF proxy (ADR-005).
 *
 * All of these run on the Next server (route handlers). The browser never calls the gateway
 * directly — it calls our same-origin /api/admin/* handlers, which use these helpers to attach the
 * Bearer access token (from an httpOnly cookie) and to exchange/rotate the gateway's `fardeen_rt`
 * refresh cookie. This keeps tokens out of client JS and avoids cross-origin/CORS entirely.
 */
const GATEWAY_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

/** The gateway's own refresh cookie name (set at Path=/api/v1/auth). We read its value from the
 *  gateway's Set-Cookie and re-home it as our own httpOnly cookie. */
const GATEWAY_RT_NAME = 'fardeen_rt';

export interface GatewayError {
  status: number;
  code: string;
  message: string;
  details?: unknown[];
}

export interface AuthTokens {
  accessToken: string;
  /** Opaque refresh token pulled out of the gateway's Set-Cookie header. */
  refreshToken: string | null;
}

export type GatewayResult<T> = { ok: true; value: T } | { ok: false; error: GatewayError };

function toError(status: number, json: unknown): GatewayError {
  const body = (json as { error?: { code?: string; message?: string; details?: unknown[] } } | null)?.error;
  return {
    status,
    code: body?.code ?? 'HTTP_ERROR',
    message: body?.message ?? 'Request failed',
    details: body?.details,
  };
}

/** Pull the gateway's `fardeen_rt` value out of a Response's Set-Cookie header(s). */
function extractRefreshToken(res: Response): string | null {
  // undici (Node 18+) exposes getSetCookie(); fall back to the combined header.
  const cookies =
    typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as { getSetCookie: () => string[] }).getSetCookie()
      : ([res.headers.get('set-cookie')].filter(Boolean) as string[]);
  for (const c of cookies) {
    const first = c.split(';', 1)[0];
    const eq = first.indexOf('=');
    if (eq > 0 && first.slice(0, eq).trim() === GATEWAY_RT_NAME) {
      return first.slice(eq + 1).trim();
    }
  }
  return null;
}

async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

/** POST /auth/login — returns access token (body) + refresh token (parsed from Set-Cookie). */
export async function gatewayLogin(email: string, password: string): Promise<GatewayResult<AuthTokens>> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch (cause) {
    return { ok: false, error: { status: 0, code: 'NETWORK_ERROR', message: 'Could not reach the API', details: [String(cause)] } };
  }
  const json = await readJson(res);
  if (!res.ok) return { ok: false, error: toError(res.status, json) };
  const accessToken = (json as { data?: { accessToken?: string } } | null)?.data?.accessToken;
  if (!accessToken) return { ok: false, error: { status: 502, code: 'BAD_UPSTREAM', message: 'No access token in login response' } };
  return { ok: true, value: { accessToken, refreshToken: extractRefreshToken(res) } };
}

/** POST /auth/refresh — sends the refresh token as the gateway's cookie; rotates it. */
export async function gatewayRefresh(refreshToken: string): Promise<GatewayResult<AuthTokens>> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `${GATEWAY_RT_NAME}=${refreshToken}` },
      cache: 'no-store',
    });
  } catch (cause) {
    return { ok: false, error: { status: 0, code: 'NETWORK_ERROR', message: 'Could not reach the API', details: [String(cause)] } };
  }
  const json = await readJson(res);
  if (!res.ok) return { ok: false, error: toError(res.status, json) };
  const accessToken = (json as { data?: { accessToken?: string } } | null)?.data?.accessToken;
  if (!accessToken) return { ok: false, error: { status: 502, code: 'BAD_UPSTREAM', message: 'No access token in refresh response' } };
  // Gateway rotates the cookie; keep the old value if it somehow didn't re-issue.
  return { ok: true, value: { accessToken, refreshToken: extractRefreshToken(res) ?? refreshToken } };
}

/** POST /auth/logout — best-effort server-side revoke. */
export async function gatewayLogout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    await fetch(`${GATEWAY_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `${GATEWAY_RT_NAME}=${refreshToken}` },
      cache: 'no-store',
    });
  } catch {
    // best-effort; we clear our own cookies regardless
  }
}

export interface AdminCallResult {
  status: number;
  /** Parsed gateway JSON envelope ({data,meta} or {error,meta}); null if none. */
  json: unknown;
}

/** Call a gateway /admin/* route with a Bearer token. Pure passthrough — no refresh here (the proxy
 *  handles 401→refresh→retry so it can also persist rotated cookies on the outgoing response). */
export async function callAdmin(
  method: string,
  adminPath: string,
  accessToken: string,
  opts: { body?: string; search?: string } = {},
): Promise<AdminCallResult> {
  const url = `${GATEWAY_BASE}/admin/${adminPath}${opts.search ?? ''}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: opts.body, cache: 'no-store' });
  } catch (cause) {
    return { status: 0, json: { error: { code: 'NETWORK_ERROR', message: 'Could not reach the API', details: [String(cause)] } } };
  }
  return { status: res.status, json: await readJson(res) };
}
