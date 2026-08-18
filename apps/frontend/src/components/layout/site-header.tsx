'use client';

import { Container } from '@fardeen/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '../../lib/site';

/**
 * Reference-style marketing header (owner-approved "We Build Dreams" design): compact gold "A" mark
 * + wordmark on the LEFT, a gold GET A QUOTE pill on the RIGHT — and deliberately NO middle nav
 * links (owner's standing rule; site navigation lives in the footer + in-page CTAs). Always
 * transparent (never a solid band); a whisper-subtle top gradient keeps it legible.
 *
 * Sticky ONLY on the homepage, where it floats over the 3D canvas as designed. On text-heavy
 * subpages (/services, /projects, /contact, …) it stays in normal flow and scrolls away, so page
 * headings and accordion rows can never collide with the wordmark or the GET A QUOTE pill at any
 * scroll position.
 */
export function SiteHeader() {
  const sticky = usePathname() === '/';
  return (
    <header
      className={`${sticky ? 'sticky' : 'relative'} pointer-events-none top-0 z-40 bg-gradient-to-b from-background/35 to-transparent`}
    >
      <Container size="wide" className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-3 rounded"
          aria-label={`${SITE.name} — home`}
        >
          {/* Code-drawn gold "A" mark (thin line style — no image files). */}
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className="h-7 w-7 shrink-0 text-gold sm:h-8 sm:w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 4 5 28h5.4L16 14.6 21.6 28H27L16 4z" />
            <path d="M11.8 21.4h8.4" />
          </svg>
          <span className="flex flex-col leading-none">
            <span className="whitespace-nowrap font-display text-[0.72rem] font-semibold tracking-[0.12em] text-foreground sm:text-base sm:tracking-[0.18em]">
              {SITE.name.toUpperCase()}
            </span>
            <span className="mt-1 hidden text-[0.5rem] uppercase tracking-[0.34em] text-gold/80 sm:block">
              Foundation to finish
            </span>
          </span>
        </Link>
        <Link
          href="/contact?subject=Request a quotation"
          className="premium-cta pointer-events-auto whitespace-nowrap rounded-full bg-gold px-3.5 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-black after:content-none sm:px-5 sm:text-[0.68rem] sm:tracking-[0.18em]"
        >
          Get a quote
        </Link>
      </Container>
    </header>
  );
}
