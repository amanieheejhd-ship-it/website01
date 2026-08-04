'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * True only after hydration AND when the user allows motion. `useReducedMotion` defaults to `true`
 * (reduced) until measured, so this is `false` on the server and the first client render — every
 * motion primitive therefore renders its plain, visible, static markup for SSR / no-JS / reduced
 * motion, and only opts into animation once this flips. DOM sections 12–15 sit far below the fold,
 * so applying the initial hidden state post-hydration causes no visible flash.
 */
export function useMotionReady(): boolean {
  const reduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && !reduced;
}
