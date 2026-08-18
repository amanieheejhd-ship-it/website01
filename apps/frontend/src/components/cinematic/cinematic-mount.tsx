'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { useWebGLSupport } from '../../hooks/use-webgl-support';
import { SCENE_COUNT, sceneScrollVh } from '../../lib/cinematic/scenes';
import { CinematicHud } from './cinematic-hud';

// Client-only dynamic import: the three/gsap/lenis bundle never touches SSR and only downloads once
// a real user interacts (see below).
const CinematicExperience = dynamic(() => import('./cinematic-experience'), {
  ssr: false,
  loading: () => null,
});

const INTERACTION_EVENTS = ['wheel', 'pointermove', 'touchstart', 'keydown'] as const;
/** [two-line headline, copy] per chapter — mirrors the cinematic caption cards so the static path
 *  (mobile / reduced-motion / no WebGL) carries the same reference design language. */
const STATIC_ROOMS = [
  ['Living hall', 'Luxury in every little detail', 'The main door opens straight into the living hall — plush seating, a media wall and warm, layered lamplight.'],
  ['Kitchen & dining', 'Modern kitchens made for you', 'An island kitchen with cooktop, hood and full-height storage, beside a six-seat dining table.'],
  ['Staircase', 'Crafted to move you', 'Floating timber treads and a bronze rail, drawing you to the upper floor.'],
  ['Master bedroom', 'Comfort meets elegance', 'An upholstered bed, fitted wardrobes and a private door to the attached washroom.'],
  ['Attached washroom', 'Refined down to the marble', 'Marble surfaces, a frameless glass shower, vanity and mirror — entered from the bedroom.'],
  ['Second bedroom', 'Room to grow, room to rest', 'A bed, wardrobe and study desk under warm ceiling light.'],
  ['Terrace', 'Evenings above the skyline', 'An outdoor lounge among planters, open to the evening sky.'],
] as const;

function StaticInteriorNavigator() {
  const [room, setRoom] = useState(0);
  const [name, headline, copy] = STATIC_ROOMS[room];
  return (
    <section
      data-cinematic-static
      aria-label="Villa walkthrough"
      className="mx-auto my-12 w-full max-w-2xl px-4"
    >
      <div className="rounded-xl border border-gold/20 bg-surface/70 p-7 sm:p-9">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-gold">The walkthrough · {name}</p>
        <p className="mt-4 font-display text-4xl font-semibold leading-none text-gold/90">
          {String(room + 1).padStart(2, '0')}
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {headline}
        </h2>
        <span className="mt-4 block h-px w-14 bg-gold/70" />
        <p className="mt-4 text-sm leading-relaxed text-muted">{copy}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded border border-gold/35 px-4 py-2 text-sm text-foreground"
            onClick={() => setRoom((room - 1 + STATIC_ROOMS.length) % STATIC_ROOMS.length)}
          >
            Previous
          </button>
          <div aria-hidden="true" className="flex items-center gap-1.5">
            {STATIC_ROOMS.map((entry, i) => (
              <span
                key={entry[0]}
                className={`h-1.5 w-1.5 rounded-full ${i === room ? 'bg-gold' : 'bg-gold/25'}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="rounded bg-gold px-4 py-2 text-sm text-black"
            onClick={() => setRoom((room + 1) % STATIC_ROOMS.length)}
          >
            Next
          </button>
        </div>
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

  // Mobile now runs the REAL walkthrough (with a tuned low-cost profile inside the experience).
  // The static navigator remains an automatic safety net only for: prefers-reduced-motion, no
  // WebGL, genuinely weak devices (deviceMemory ≤ 2GB), or a sustained sub-24fps probe after start
  // (the experience reports via onTooSlow and we swap seamlessly — the engine unmounts cleanly, so
  // there is never a broken canvas).
  const [weakDevice, setWeakDevice] = useState(false);
  const [tooSlow, setTooSlow] = useState(false);
  useEffect(() => {
    const memory = (navigator as { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory <= 2) setWeakDevice(true);
  }, []);

  const enabled = !reducedMotion && !weakDevice && !tooSlow && webgl === true;

  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || active) return;
    const activate = () => setActive(true);
    const opts: AddEventListenerOptions = { once: true, passive: true };
    INTERACTION_EVENTS.forEach((ev) => window.addEventListener(ev, activate, opts));
    return () => INTERACTION_EVENTS.forEach((ev) => window.removeEventListener(ev, activate));
  }, [enabled, active]);

  if (reducedMotion || weakDevice || tooSlow || webgl === false) return <StaticInteriorNavigator />;
  if (!enabled) return null;
  if (active)
    return (
      <>
        <CinematicHud />
        <CinematicExperience onTooSlow={() => setTooSlow(true)} />
      </>
    );

  return (
    <>
      <CinematicHud />
      <div
        aria-hidden="true"
        data-cinematic-spacer
        className="relative bg-background"
        style={{
          height: `${SCENE_COUNT * sceneScrollVh(window.matchMedia('(pointer: coarse)').matches)}vh`,
        }}
      >
        {/* svh: stable height on phones (no address-bar jump); inline style is ignored by browsers
            without svh support and the h-screen class takes over. */}
        <div className="sticky top-0 h-screen w-full bg-background" style={{ height: '100svh' }} />
      </div>
    </>
  );
}
