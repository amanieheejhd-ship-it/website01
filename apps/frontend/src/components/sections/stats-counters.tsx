'use client';

import { Container, Section } from '@fardeen/ui';
import { useEffect, useRef, useState } from 'react';

/**
 * Reference-style "Numbers That Define Us" stat band. Counters count up ONCE when the band scrolls
 * into view (rAF, ease-out); under prefers-reduced-motion they render the final values statically.
 */

/**
 * OWNER-EDITABLE: set the real business numbers here. `end` is the number counted to and `suffix`
 * is appended after it ("+" or "%"). Defaults are placeholders — replace with actuals.
 */
const STATS = [
  { end: 10, suffix: '+', label: 'Years of experience' },
  { end: 120, suffix: '+', label: 'Projects completed' },
  { end: 90, suffix: '+', label: 'Happy clients' },
  { end: 25, suffix: '+', label: 'Experts on team' },
  { end: 100, suffix: '%', label: 'Client satisfaction' },
] as const;

const DURATION_MS = 1100;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function StatsSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<number[]>(() => STATS.map(() => 0));
  const started = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const finish = () => setValues(STATS.map((s) => s.end));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();
        const startedAt = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - startedAt) / DURATION_MS);
          const k = easeOutCubic(t);
          setValues(STATS.map((s) => Math.round(s.end * k)));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Section spacing="lg" aria-labelledby="stats-heading">
      <Container size="wide">
        <h2 id="stats-heading" className="mb-10 font-display text-3xl font-bold text-foreground sm:text-4xl">
          Numbers That Define Us
        </h2>
        <div ref={rootRef} className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
              <p className="font-display text-4xl font-bold tabular-nums text-gold sm:text-5xl">
                {values[i]}
                {stat.suffix}
              </p>
              <span aria-hidden="true" className="h-px w-10 bg-gold/40" />
              <p className="text-[0.6rem] uppercase tracking-[0.22em] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
