'use client';

import { m, useMotionValue, useSpring } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMotionReady } from '../../hooks/use-motion-ready';

/**
 * Hover micro-interaction: the element is gently pulled toward the cursor. Springs give it weight.
 * Falls back to a plain, static wrapper when motion isn't ready (SSR / no-JS / reduced motion).
 */
export function MagneticCard({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ready = useMotionReady();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.3 });

  if (!ready) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * strength)));
        y.set(Math.max(-8, Math.min(8, (e.clientY - (r.top + r.height / 2)) * strength)));
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
