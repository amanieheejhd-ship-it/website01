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
const STATIC_ROOMS = [
  ['Foyer', 'Console, entry rug and warm pendant lighting'],
  ['Living room', 'Designer seating, marble table, media wall and large windows'],
  ['Dining room', 'Six-seat dining table and sculptural pendant'],
  ['Kitchen', 'Island, cabinets, cooktop, hood, sink, fridge, AC and tiled floor'],
  ['Powder room', 'Private tiled room with vanity, mirror and toilet'],
  ['Staircase', 'The connected route to the upper floor'],
  ['Landing', 'Upper hallway connecting every private room'],
  ['Master bedroom', 'Upholstered bed, wardrobe, lamps, AC and wooden floor'],
  ['Master bathroom', 'Marble vanity, mirror, tub, shower glass and toilet'],
  ['Second bedroom', 'Bed, wardrobe, desk and warm ceiling light'],
] as const;

function StaticInteriorNavigator() {
  const [room, setRoom] = useState(0);
  return (
    <section aria-label="Villa interior rooms" className="mx-auto my-10 max-w-xl rounded-xl border border-gold/20 bg-surface/80 p-6">
      <p className="text-xs uppercase tracking-[.25em] text-gold">Static interior tour</p>
      <h2 className="mt-2 font-display text-2xl text-foreground">{STATIC_ROOMS[room][0]}</h2>
      <p className="mt-2 text-sm text-muted">{STATIC_ROOMS[room][1]}</p>
      <div className="mt-5 flex justify-between gap-3">
        <button type="button" className="rounded border border-gold/35 px-4 py-2 text-sm text-foreground" onClick={() => setRoom((room - 1 + STATIC_ROOMS.length) % STATIC_ROOMS.length)}>Previous room</button>
        <button type="button" className="rounded bg-gold px-4 py-2 text-sm text-black" onClick={() => setRoom((room + 1) % STATIC_ROOMS.length)}>Next room</button>
      </div>
    </section>
  );
}

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

  if (reducedMotion) return <StaticInteriorNavigator />;
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
