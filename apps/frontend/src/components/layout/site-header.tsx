import { Container } from '@fardeen/ui';
import Link from 'next/link';
import { NAV_LINKS, SITE } from '../../lib/site';
import { MobileNav } from './mobile-nav';

/** Sticky marketing header with the wordmark + primary nav (inline on desktop, hamburger on mobile). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <Container size="wide" className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="min-w-0 truncate whitespace-nowrap rounded font-display text-base font-medium tracking-[0.12em] text-foreground sm:text-lg sm:tracking-[0.2em]"
          aria-label={`${SITE.name} — home`}
        >
          {SITE.name.toUpperCase()}
        </Link>
        {/* Desktop inline nav */}
        <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {/* Mobile hamburger + panel (below md) */}
        <MobileNav />
      </Container>
    </header>
  );
}
