'use client';

import { m, useMotionValue, useSpring } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMotionReady } from '../../hooks/use-motion-ready';

/**
 * Hover micro-interaction: a subtle 3D tilt following the cursor. Falls back to a plain, static
 * wrapper when motion isn't ready (SSR / no-JS / reduced motion). `max` is the tilt in degrees.
 */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ready = useMotionReady();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18, mass: 0.4 });

  if (!ready) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rx.set(-py * max * 2);
        ry.set(px * max * 2);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
