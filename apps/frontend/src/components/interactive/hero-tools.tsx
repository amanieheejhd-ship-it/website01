'use client';

import { m, useMotionValue, useSpring } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

/**
 * Hero right-side construction cluster: thin gold line-icons of Ansari Space Craft's trades, arranged on a gentle
 * vertical arc. On load they slide in from the right (staggered ease-out), then float continuously with
 * a light pointer parallax so the composition feels alive — without competing with the headline on the
 * left. `prefers-reduced-motion` → rendered statically in place (no entrance / float / parallax).
 * Hidden below `lg` so the mobile hero stays focused on the headline. Purely decorative (aria-hidden,
 * pointer-events-none). SSR-safe: nothing renders until mounted, so there is no hydration flash.
 */

interface Tool {
  label: string;
  icon: ReactNode;
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const TOOLS: Tool[] = [
  {
    label: 'Construction',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z" />
        <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
        <path d="M4 16v-3a6 6 0 0 1 6-6" />
        <path d="M14 7a6 6 0 0 1 6 6v3" />
      </svg>
    ),
  },
  {
    label: 'Masonry',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <path d="M14.5 6.5 18 3l3 3-3.5 3.5" />
        <path d="M16 8 5.6 13.2a1 1 0 0 0-.3 1.5l4 4a1 1 0 0 0 1.5-.3L16 8z" />
      </svg>
    ),
  },
  {
    label: 'Finishing',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <rect x="2" y="9" width="20" height="6" rx="1" />
        <path d="M7 9v6M17 9v6" />
        <path d="M10.5 11h3v2h-3z" />
      </svg>
    ),
  },
  {
    label: 'Drafting',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z" />
        <path d="M8.5 6.5 10 5M11.5 9.5 13 8M14.5 12.5 16 11M17.5 15.5 19 14" />
      </svg>
    ),
  },
  {
    label: 'Structural',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <path d="M5 21V3" />
        <path d="M3 21h4" />
        <path d="M5 4h15" />
        <path d="M5 7h6" />
        <path d="M19 4v4" />
        <path d="M17.6 8h2.8l-1.4 2.4z" />
      </svg>
    ),
  },
  {
    label: 'Installation',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <path d="m14 12-8.5 8.5a2.1 2.1 0 1 1-3-3L11 9" />
        <path d="M17.6 15 22 10.6" />
        <path d="M15 5.5 18.5 9l2-2a2.5 2.5 0 0 0-3.5-3.5z" />
      </svg>
    ),
  },
  {
    label: 'Fabrication',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
      </svg>
    ),
  },
  {
    label: 'Interiors',
    icon: (
      <svg viewBox="0 0 24 24" {...S}>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M12 3v18" />
        <path d="M9 10.5v2M15 10.5v2" />
      </svg>
    ),
  },
];

/** Convex arc that opens toward the right edge: middle items sit further left. */
const arcRight = (t: number): number => Math.sin(t * Math.PI) * 84; // px inset from the right

export function HeroTools(): JSX.Element | null {
  const [ready, setReady] = useState<null | { reduced: boolean }>(null);

  // Pointer parallax (whole cluster drifts slightly opposite the pointer).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const parX = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const parY = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    setReady({ reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }, []);

  const reduced = ready?.reduced ?? true;

  useEffect(() => {
    if (!ready || reduced) return;
    const onMove = (e: MouseEvent): void => {
      px.set((e.clientX / window.innerWidth - 0.5) * -22);
      py.set((e.clientY / window.innerHeight - 0.5) * -16);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [ready, reduced, px, py]);

  if (!ready) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[46%] max-w-[560px] lg:block"
    >
      <m.div
        className="relative h-full w-full"
        style={reduced ? undefined : { x: parX, y: parY }}
      >
        {TOOLS.map((tool, i) => {
          const t = TOOLS.length > 1 ? i / (TOOLS.length - 1) : 0;
          const topPct = 8 + t * 82;
          const rightPx = 40 + arcRight(t);
          return (
            <m.div
              key={tool.label}
              className="absolute flex items-center gap-3"
              style={{ top: `${topPct}%`, right: rightPx }}
              initial={reduced ? false : { opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reduced ? { duration: 0 } : { delay: 0.15 + i * 0.09, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <m.div
                className="flex items-center gap-3"
                animate={reduced ? undefined : { y: [0, -8, 0] }}
                transition={reduced ? undefined : { duration: 3.2 + i * 0.25, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
              >
                <span className="whitespace-nowrap text-right font-sans text-[0.7rem] uppercase tracking-[0.22em] text-muted">
                  {tool.label}
                </span>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/25 bg-surface/50 text-gold shadow-[0_0_24px_-8px_rgba(200,161,90,0.5)] backdrop-blur-sm">
                  <span className="h-6 w-6">{tool.icon}</span>
                </span>
              </m.div>
            </m.div>
          );
        })}
      </m.div>
    </div>
  );
}
