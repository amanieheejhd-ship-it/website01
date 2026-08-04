'use client';
/**
 * Admin chrome: a distinct sidebar/topbar layout (NOT the marketing SiteHeader/Footer) in the same
 * ink/gold language. Client component for active-nav detection + logout + responsive drawer.
 * Wraps page content in the ToastProvider so screens can surface mutation feedback.
 */
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@fardeen/types';
import { Button, cn } from '@fardeen/ui';
import { ToastProvider } from './toast';
import { AdminSessionProvider } from './session-context';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const icon = (d: string) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: icon('M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z') },
  { href: '/admin/projects', label: 'Projects', icon: icon('M4 5h16v14H4zM4 9h16M9 9v10') },
  { href: '/admin/services', label: 'Services', icon: icon('M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5') },
  { href: '/admin/pages', label: 'Pages', icon: icon('M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6') },
  { href: '/admin/contacts', label: 'Contacts', icon: icon('M4 5h16v14H4zM4 7l8 6 8-6') },
  { href: '/admin/quotations', label: 'Quotations', icon: icon('M7 3h10v18l-3-2-2 2-2-2-3 2zM9 8h6M9 12h6') },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ user, children }: { user: { email: string; role: Role }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => setDrawer(false), [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/session/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Admin sections">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-gold/12 text-gold' : 'text-muted hover:bg-white/5 hover:text-foreground',
            )}
          >
            <span className={active ? 'text-gold' : 'text-muted'}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/10 bg-surface/50 p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="font-display text-lg font-medium tracking-wide text-foreground">Fardeen</span>
          <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold">Admin</span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-white/10 pt-4">
          <UserChip user={user} onLogout={logout} loggingOut={loggingOut} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-white/10 bg-surface p-4">
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="font-display text-lg text-foreground">Fardeen Admin</span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded p-1 text-muted hover:text-foreground">✕</button>
            </div>
            {nav}
            <div className="mt-auto border-t border-white/10 pt-4">
              <UserChip user={user} onLogout={logout} loggingOut={loggingOut} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col">
        {/* Topbar (mobile) */}
        <header className="flex items-center justify-between border-b border-white/10 bg-surface/50 px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-md border border-white/15 p-2 text-foreground">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
          </button>
          <span className="font-display text-base text-foreground">Fardeen Admin</span>
          <span className="w-9" />
        </header>

        <AdminSessionProvider value={user}>
          <ToastProvider>
            <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 outline-none sm:px-8">
              {children}
            </main>
          </ToastProvider>
        </AdminSessionProvider>
      </div>
    </div>
  );
}

function UserChip({ user, onLogout, loggingOut }: { user: { email: string; role: Role }; onLogout: () => void; loggingOut: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold uppercase text-gold">
          {user.email.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{user.email}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted">{user.role}</p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onLogout} disabled={loggingOut}>
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
