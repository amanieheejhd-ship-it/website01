'use client';

import { useEffect, useState } from 'react';

/**
 * True when the user prefers reduced motion. SSR-safe (defaults to `true` so the first
 * paint is the calm, motion-free variant, then hydrates to the real preference).
 * Phase 6 gates all GSAP/R3F scroll animation on `!useReducedMotion()`.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
