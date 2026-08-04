'use client';

import { m } from 'framer-motion';
import { useMotionReady } from '../../hooks/use-motion-ready';

/**
 * A thin gold accent line that draws in from the left on scroll. Decorative (aria-hidden).
 * Renders fully drawn (static) when motion isn't ready.
 */
export function AccentLine({ className }: { className?: string }) {
  const ready = useMotionReady();
  const base = `h-px w-16 origin-left bg-gradient-to-r from-gold to-transparent ${className ?? ''}`;
  if (!ready) return <span aria-hidden="true" className={base} />;
  return (
    <m.span
      aria-hidden="true"
      className={base}
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true, amount: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
