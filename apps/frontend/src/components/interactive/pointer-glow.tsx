'use client';

import { m, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/use-reduced-motion';

/**
 * Premium site-wide mouse interaction — deliberately NOT a custom cursor (the native OS cursor stays).
 * Two pieces:
 *  1. A soft, low-opacity warm-gold radial glow that gently trails the pointer across the whole site
 *     (fixed, behind content via low z-index + screen blend, pointer-events-none, spring-eased lag).
 *  2. A magnetic pull for CTAs/buttons: while hovered, the element is nudged toward the pointer by at
 *     most 8px via the composable CSS `translate` property (so the stylesheet's hover scale/glow keep
 *     working) and springs back on leave through the stylesheet transition.
 * Rendered ONLY on fine-pointer hover devices and never under prefers-reduced-motion — on touch or
 * reduced-motion it renders nothing and applies no transforms (static site, native behavior).
 */

const MAGNETIC = '.premium-cta, button';
const MAX_PULL = 8;

export function PointerGlow(): JSX.Element | null {
  const reduced = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const [visible, setVisible] = useState(false);

  const px = useMotionValue(-600);
  const py = useMotionValue(-600);
  const glowX = useSpring(px, { stiffness: 55, damping: 20, mass: 0.9 });
  const glowY = useSpring(py, { stiffness: 55, damping: 20, mass: 0.9 });

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFinePointer(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const active = finePointer && !reduced;

  useEffect(() => {
    if (!active) return;
    let magnet: HTMLElement | null = null;

    const release = () => {
      if (magnet) magnet.style.removeProperty('translate');
      magnet = null;
    };
    const move = (event: MouseEvent) => {
      px.set(event.clientX);
      py.set(event.clientY);
      setVisible(true);
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height / 2);
        const x = Math.max(-MAX_PULL, Math.min(MAX_PULL, dx * 0.18));
        const y = Math.max(-MAX_PULL, Math.min(MAX_PULL, dy * 0.18));
        magnet.style.translate = `${x}px ${y}px`;
      }
    };
    const over = (event: MouseEvent) => {
      const next = (event.target as Element | null)?.closest?.(MAGNETIC) as HTMLElement | null;
      if (!next || next === magnet) return;
      release();
      magnet = next;
    };
    const out = (event: MouseEvent) => {
      const from = (event.target as Element | null)?.closest?.(MAGNETIC);
      const to = (event.relatedTarget as Element | null)?.closest?.(MAGNETIC);
      if (!from || from === to) return;
      release();
    };
    const leave = () => {
      setVisible(false);
      release();
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, true);
    window.addEventListener('mouseout', out, true);
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      release();
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over, true);
      window.removeEventListener('mouseout', out, true);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, [active, px, py]);

  if (!active) return null;

  return (
    <m.div
      aria-hidden="true"
      data-pointer-glow
      style={{ x: glowX, y: glowY }}
      className="pointer-events-none fixed left-0 top-0 z-[1] -ml-64 -mt-64 h-[32rem] w-[32rem] rounded-full opacity-0 transition-opacity duration-700 [background:radial-gradient(circle,rgba(200,161,90,0.09)_0%,rgba(200,161,90,0.03)_42%,transparent_72%)] [mix-blend-mode:screen]"
      animate={{ opacity: visible ? 1 : 0 }}
    />
  );
}
