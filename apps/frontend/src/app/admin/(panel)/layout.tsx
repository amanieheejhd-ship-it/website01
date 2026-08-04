/**
 * Gated admin panel layout (server component). Authoritative server-side role gate: decodes the
 * httpOnly access-token cookie and only lets `admin`/`editor` through; an authenticated `visitor`
 * gets a 403 view, no session/no cookie is bounced to login. Hard RBAC on individual actions is
 * still enforced by the gateway. Everything here is isolated from the marketing bundle.
 */
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonVariants } from '@fardeen/ui';
import { AT_COOKIE, decodeClaims, isAdminRole } from '../../../lib/admin/session';
import { AdminShell } from '../_components/admin-shell';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const claims = decodeClaims(store.get(AT_COOKIE)?.value);

  if (!claims) {
    redirect('/admin/login');
  }

  if (!isAdminRole(claims.role)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="font-display text-xs font-medium uppercase tracking-[0.3em] text-gold">403 — Forbidden</p>
        <h1 className="mt-3 font-display text-3xl font-medium text-foreground">No admin access</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Your account ({claims.email}) is signed in as <span className="text-foreground">{claims.role}</span> and cannot
          access the admin panel.
        </p>
        <Link href="/" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-6' })}>
          Back to site
        </Link>
      </main>
    );
  }

  return <AdminShell user={{ email: claims.email, role: claims.role }}>{children}</AdminShell>;
}
