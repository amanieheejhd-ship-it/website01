'use client';

import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/use-reduced-motion';

function CheckBadge({ animate }: { animate: boolean }) {
  return (
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 ring-1 ring-gold/40">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#e5c987"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <m.path
          d="M4 12.5l5 5L20 6"
          initial={animate ? { pathLength: 0 } : false}
          animate={animate ? { pathLength: 1 } : undefined}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        />
      </svg>
    </div>
  );
}

/**
 * Success micro-animation for form confirmations: a checkmark draws in and the panel springs up.
 * Only rendered after a submit succeeds (client-only, never SSR). Static when reduced motion.
 */
export function SuccessReveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div className={className}>
        <CheckBadge animate={false} />
        {children}
      </div>
    );
  }
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
    >
      <CheckBadge animate />
      {children}
    </m.div>
  );
}
