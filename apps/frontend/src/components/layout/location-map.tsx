'use client';

import { useEffect, useRef, useState } from 'react';
import { SITE } from '../../lib/site';

/**
 * Compact rounded location square for the footer — a Google Maps embed that can NEVER show a
 * broken gray box:
 *
 *  - While the iframe loads it sits transparent over an elegant code-drawn pin backdrop, so the
 *    first paint is always intentional.
 *  - If the iframe fires `error`, or never fires `load` within the timeout (offline, blocked,
 *    embed refused), the iframe is dropped entirely and the pin card stays — with the address and
 *    "Get directions" link right below, the fallback reads as a designed location card.
 *
 * The address line + directions link live INSIDE this component so each appears exactly once in
 * the footer regardless of map state (zero-duplication rule).
 */

const LOAD_TIMEOUT_MS = 7000;

type MapState = 'loading' | 'ok' | 'failed';

export function LocationMap({ className = '' }: { className?: string }) {
  const [state, setState] = useState<MapState>('loading');
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state !== 'loading') return;
    const t = window.setTimeout(() => {
      if (stateRef.current === 'loading') setState('failed');
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [state]);

  return (
    <div data-map-state={state} className={className}>
      <p className="mb-3 text-sm text-muted">{SITE.locality}</p>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gold/25 bg-surface shadow-[0_0_40px_-16px_rgba(200,161,90,0.35)]">
        {/* Code-drawn pin backdrop: the loading placeholder AND the permanent fallback. */}
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(60%_60%_at_50%_42%,rgba(200,161,90,0.09),transparent_75%)]">
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-9 w-9 text-gold"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {state === 'failed' ? (
              <p className="text-[0.62rem] uppercase tracking-[0.2em] text-muted">Serving Zirakpur &amp; Tricity</p>
            ) : null}
          </div>
        </div>
        {state !== 'failed' ? (
          <iframe
            title={`Map of ${SITE.locality}`}
            src={SITE.mapEmbedUrl}
            className={`relative block h-full w-full border-0 transition-opacity duration-500 ${
              state === 'ok' ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setState('ok')}
            onError={() => setState('failed')}
          />
        ) : null}
      </div>
      <a
        href={SITE.mapLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-11 items-center rounded text-sm text-gold transition-colors hover:text-gold-light"
      >
        Get directions →
      </a>
    </div>
  );
}
