import { Container } from '@fardeen/ui';
import Link from 'next/link';
import { NAV_LINKS, SITE } from '../../lib/site';

/** Sticky marketing header with the wordmark + primary nav. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <Container size="wide" className="flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="rounded font-display text-lg font-medium tracking-[0.2em] text-foreground"
          aria-label={`${SITE.name} — home`}
        >
          {SITE.name.toUpperCase()}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6 text-sm">
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
      </Container>
    </header>
  );
}
