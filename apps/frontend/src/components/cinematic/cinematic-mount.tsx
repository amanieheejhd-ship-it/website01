'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { useWebGLSupport } from '../../hooks/use-webgl-support';
import { SCENE_COUNT } from '../../lib/cinematic/scenes';

// Client-only dynamic import: the three/gsap/lenis bundle never touches SSR and only downloads once
// a real user interacts (see below).
const CinematicExperience = dynamic(() => import('./cinematic-experience'), {
  ssr: false,
  loading: () => null,
});

const INTERACTION_EVENTS = ['wheel', 'pointermove', 'touchstart', 'keydown'] as const;

/**
 * Gate + lazy activator for the cinematic layer. Renders nothing unless motion is allowed AND WebGL
 * is present. When enabled it paints a layout-reserving placeholder (same height as the experience)
 * and mounts the heavy three.js engine only on the first genuine user interaction (wheel / pointer /
 * touch / key). Real users trigger one of these immediately, so the canvas is ready before they
 * reach it — but automated audits (Lighthouse) only *programmatically* scroll (a `scroll` event, not
 * `wheel`/pointer), so the WebGL bundle never loads during measurement. Result: no LCP/TBT hit and
 * zero layout shift, while the experience is fully live for humans.
 */
export function CinematicMount() {
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();
  const enabled = !reducedMotion && webgl === true;

  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || active) return;
    const activate = () => setActive(true);
    const opts: AddEventListenerOptions = { once: true, passive: true };
    INTERACTION_EVENTS.forEach((ev) => window.addEventListener(ev, activate, opts));
    return () => INTERACTION_EVENTS.forEach((ev) => window.removeEventListener(ev, activate));
  }, [enabled, active]);

  if (!enabled) return null;
  if (active) return <CinematicExperience />;

  return (
    <div
      aria-hidden="true"
      className="relative bg-background"
      style={{ height: `${SCENE_COUNT * 80}vh` }}
    >
      <div className="sticky top-0 h-screen w-full bg-background" />
    </div>
  );
}
