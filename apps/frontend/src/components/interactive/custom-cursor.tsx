'use client';

import { m, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/use-reduced-motion';

/**
 * Site-wide custom cursor: a gold ring that trails the pointer with spring easing + a tight inner dot.
 * Over interactive elements the ring grows, fills, and is magnetically nudged toward the element's
 * centre. Rendered ONLY on true desktop pointers (`hover: hover` + `pointer: fine`) and never under
 * `prefers-reduced-motion` — on touch / reduced-motion it renders nothing and the native cursor stays,
 * so no device is ever left without a visible pointer. Mounted once inside the root providers.
 */

const INTERACTIVE = 'a, button, [role="button"], label, summary, [data-cursor="hover"]';

export function CustomCursor(): JSX.Element | null {
  const reduced = useReducedMotion();
  const [supported, setSupported] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const hoveredEl = useRef<Element | null>(null);

  // Raw pointer position (drives the dot) + a magnetically-adjusted source (drives the ring).
  const dotSrcX = useMotionValue(-100);
  const dotSrcY = useMotionValue(-100);
  const ringSrcX = useMotionValue(-100);
  const ringSrcY = useMotionValue(-100);

  const ringX = useSpring(ringSrcX, { stiffness: 260, damping: 26, mass: 0.5 });
  const ringY = useSpring(ringSrcY, { stiffness: 260, damping: 26, mass: 0.5 });
  const dotX = useSpring(dotSrcX, { stiffness: 900, damping: 40, mass: 0.2 });
  const dotY = useSpring(dotSrcY, { stiffness: 900, damping: 40, mass: 0.2 });

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = (): void => setSupported(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const active = supported && !reduced;

  useEffect(() => {
    if (!active) return;

    const move = (e: MouseEvent): void => {
      const cx = e.clientX;
      const cy = e.clientY;
      dotSrcX.set(cx);
      dotSrcY.set(cy);
      const el = hoveredEl.current;
      if (el) {
        // Magnetic pull: nudge the ring ~30% toward the hovered element's centre.
        const r = el.getBoundingClientRect();
        ringSrcX.set(cx + (r.left + r.width / 2 - cx) * 0.3);
        ringSrcY.set(cy + (r.top + r.height / 2 - cy) * 0.3);
      } else {
        ringSrcX.set(cx);
        ringSrcY.set(cy);
      }
    };
    const over = (e: MouseEvent): void => {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
      if (el) {
        hoveredEl.current = el;
        setHovering(true);
      }
    };
    const out = (e: MouseEvent): void => {
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) {
        hoveredEl.current = null;
        setHovering(false);
      }
    };
    const down = (): void => setPressed(true);
    const up = (): void => setPressed(false);
    const leave = (): void => {
      dotSrcX.set(-100);
      dotSrcY.set(-100);
      ringSrcX.set(-100);
      ringSrcY.set(-100);
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, true);
    window.addEventListener('mouseout', out, true);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    document.documentElement.addEventListener('mouseleave', leave);
    document.documentElement.classList.add('has-custom-cursor');

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over, true);
      window.removeEventListener('mouseout', out, true);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      document.documentElement.removeEventListener('mouseleave', leave);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [active, dotSrcX, dotSrcY, ringSrcX, ringSrcY]);

  if (!active) return null;

  return (
    <>
      {/* Trailing ring */}
      <m.div
        aria-hidden="true"
        style={{ x: ringX, y: ringY }}
        className="pointer-events-none fixed left-0 top-0 z-[9999] -ml-[18px] -mt-[18px] h-9 w-9 rounded-full border border-gold"
        animate={{
          scale: hovering ? 1.9 : pressed ? 0.8 : 1,
          backgroundColor: hovering ? 'rgba(200,161,90,0.15)' : 'rgba(200,161,90,0)',
          borderColor: hovering ? 'rgba(229,201,135,0.9)' : 'rgba(200,161,90,0.6)',
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      />
      {/* Tight centre dot (hidden while hovering, so the filled ring reads cleanly) */}
      <m.div
        aria-hidden="true"
        style={{ x: dotX, y: dotY }}
        className="pointer-events-none fixed left-0 top-0 z-[9999] -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-gold"
        animate={{ scale: hovering ? 0 : pressed ? 0.6 : 1, opacity: hovering ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </>
  );
}
