import { Container } from '@fardeen/ui';
import Link from 'next/link';
import { SITE } from '../../lib/site';

/**
 * Marketing header: ONLY the centered wordmark (linking home) — no navigation, no menu button, on any
 * screen size. Permanently transparent at every scroll position so it always blends with the content
 * behind it (never a solid band); a whisper-subtle top gradient keeps the wordmark legible without
 * ever reading as a bar. Site navigation lives in the footer + in-page CTAs.
 */
export function SiteHeader() {
  return (
    <header className="pointer-events-none sticky top-0 z-40 bg-gradient-to-b from-background/35 to-transparent">
      <Container size="wide" className="relative flex h-16 items-center justify-center">
        <Link
          href="/"
          className="pointer-events-auto whitespace-nowrap rounded font-display text-sm font-medium tracking-[0.14em] text-foreground sm:text-lg sm:tracking-[0.2em]"
          aria-label={`${SITE.name} — home`}
        >
          {SITE.name.toUpperCase()}
        </Link>
      </Container>
    </header>
  );
}
