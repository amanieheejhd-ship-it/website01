'use client';

import { buttonVariants, Container, Heading, Section } from '@fardeen/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Accordion } from '../interactive/accordion';
import { CORE_SERVICES } from './services-content';

/**
 * "Twelve trades. One accountable team." — the services discipline index + an EXCLUSIVE accordion
 * of detail panels. Selecting a discipline (from the index or the list) opens ONLY that panel;
 * every other one closes. Clicking the open one closes it. Deep links (/services#slug) open and
 * scroll to that discipline on load, so existing anchors keep working.
 */
export function DisciplinesSection() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  // Honour /services#slug deep links — on arrival AND on later hash changes (footer links, tiles).
  // The landing is INSTANT (never the CSS smooth glide), so the user lands directly on the open
  // panel just below the top of the viewport with no visible stop at the page intro.
  useEffect(() => {
    const openSlugFromHash = (slug: string) => {
      if (!slug) return;
      if (!CORE_SERVICES.some((s) => s.slug === slug)) {
        // Non-discipline anchors on this page (e.g. #process-heading from the footer) still land
        // INSTANTLY instead of the CSS smooth glide from the top.
        requestAnimationFrame(() => {
          document
            .getElementById(slug)
            ?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
        });
        return;
      }
      setOpenSlug(slug);
      // Two frames: let the panel mount its open state before positioning, then pin the row to the
      // top (scroll-margin-top on the row keeps a comfortable gap).
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          document
            .getElementById(slug)
            ?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
        }),
      );
    };
    const applyHash = () => openSlugFromHash(window.location.hash.slice(1));
    // Same-page hash links (e.g. the footer's service links while already on /services) go through
    // Next's router, which pushState-es the URL — and pushState fires NEITHER hashchange NOR
    // popstate. Delegated click handling catches those; hashchange/popstate cover direct fragment
    // navigation and back/forward traversal.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href*="#"]');
      if (!anchor) return;
      const url = new URL((anchor as HTMLAnchorElement).href, window.location.href);
      if (url.pathname !== window.location.pathname) return; // cross-page → mount effect handles it
      openSlugFromHash(url.hash.slice(1));
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    window.addEventListener('popstate', applyHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', applyHash);
      window.removeEventListener('popstate', applyHash);
      document.removeEventListener('click', onClick);
    };
  }, []);

  const openFromIndex = (slug: string) => {
    setOpenSlug(slug);
    // Let the panel begin opening, then bring it into view.
    requestAnimationFrame(() => {
      document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <Section spacing="sm" aria-labelledby="service-index-heading">
      <Container size="wide">
        <div className="border-y border-gold/20 py-8 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Service disciplines</p>
              <Heading id="service-index-heading" size="md" className="mt-3">
                Twelve trades. One accountable team.
              </Heading>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              Select a discipline to open its full scope — one panel at a time.
            </p>
          </div>

          {/* Index — jumps to and opens the matching panel below. */}
          <nav aria-label="Service index" className="mt-8 overflow-x-auto">
            <ol className="grid min-w-[44rem] grid-cols-4 gap-3 md:min-w-0 lg:grid-cols-6">
              {CORE_SERVICES.map((service) => (
                <li key={service.slug}>
                  <button
                    type="button"
                    onClick={() => openFromIndex(service.slug)}
                    aria-expanded={openSlug === service.slug}
                    className={`flex min-h-16 w-full items-center gap-3 border-b px-2 py-3 text-left text-sm transition-colors duration-200 ${
                      openSlug === service.slug
                        ? 'border-gold text-foreground'
                        : 'border-white/10 text-muted hover:border-gold/50 hover:text-foreground'
                    }`}
                  >
                    <span className="font-display text-gold">{service.number}</span>
                    <span>{service.shortName}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Exclusive detail accordion. */}
        <Accordion
          openId={openSlug}
          onOpenChange={setOpenSlug}
          className="mt-2"
          items={CORE_SERVICES.map((service) => ({
            id: service.slug,
            header: (
              <span id={service.slug} className="flex scroll-mt-24 items-baseline gap-5 py-6 sm:gap-8">
                <span aria-hidden="true" className="font-display text-3xl leading-none text-gold/60 sm:text-4xl">
                  {service.number}
                </span>
                <span>
                  <span
                    className={`block font-display text-xl font-medium leading-tight transition-colors duration-200 sm:text-2xl ${
                      openSlug === service.slug ? 'text-gold' : 'text-foreground group-hover/acc:text-gold-light'
                    }`}
                  >
                    {service.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-3 block h-px w-16 origin-left bg-gold transition-transform duration-300 ${
                      openSlug === service.slug ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </span>
              </span>
            ),
            content: (
              <div className="grid gap-8 pb-10 pl-0 pt-1 sm:pl-14 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:gap-14">
                <div>
                  <p className="max-w-xl text-lg leading-relaxed text-gold/90">{service.positioning}</p>
                  <p className="mt-5 max-w-xl text-base leading-8 text-muted">{service.description}</p>
                  <Link
                    href={`/contact?service=${encodeURIComponent(service.title)}`}
                    className={`${buttonVariants({ variant: 'outline' })} mt-7`}
                  >
                    Discuss this service
                  </Link>
                </div>
                <div className="grid gap-8 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground">
                      What we handle
                    </h3>
                    <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
                      {service.includes.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span aria-hidden="true" className="text-gold">
                            —
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-7">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground">
                        Typical applications
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-muted">{service.applications}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground">
                        Materials & scope
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-muted">{service.materials}</p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          }))}
          itemClassName="border-b border-gold/20"
        />
      </Container>
    </Section>
  );
}
