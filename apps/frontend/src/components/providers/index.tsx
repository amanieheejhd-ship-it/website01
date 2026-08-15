'use client';

import { domAnimation, LazyMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { PointerGlow } from '../interactive/pointer-glow';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

/**
 * Root client-provider stack mounted once in the app layout. LazyMotion loads only the
 * `domAnimation` feature set (whileInView + variants + gestures, no drag/layout) and enforces
 * `m` components (strict) so the Framer footprint on the marketing pages stays small.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <LazyMotion features={domAnimation} strict>
          <PointerGlow />
          {children}
        </LazyMotion>
      </QueryProvider>
    </ThemeProvider>
  );
}
