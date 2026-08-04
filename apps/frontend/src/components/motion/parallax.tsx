'use client';

import { m, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { useMotionReady } from '../../hooks/use-motion-ready';

/**
 * Subtle vertical parallax as the element scrolls through the viewport. `speed` is the peak offset
 * in px (positive = moves up on scroll). Static wrapper when motion isn't ready.
 */
export function Parallax({
  children,
  className,
  speed = 40,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ready = useMotionReady();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);

  if (!ready) return <div className={className}>{children}</div>;
  return (
    <m.div ref={ref} className={className} style={{ y }}>
      {children}
    </m.div>
  );
}
