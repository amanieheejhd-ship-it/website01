'use client';

import { useEffect, useRef, useState } from 'react';
import { SCENE_COUNT } from '../../lib/cinematic/scenes';

/**
 * Reference-style HUD over the cinematic walkthrough (desktop ≥1024px only; the mount never renders
 * this on small screens / reduced motion):
 *
 *  - LEFT numbered chapter rail: one gold dot + number + tiny label per scene, with a thin gold
 *    progress line that fills as the journey scrubs. Clicking a chapter scrolls the page to that
 *    scene's caption moment — through Lenis via the `__fardeenScrollTo` seam when the engine is
 *    live, else native smooth scroll (the placeholder spacer has the same geometry).
 *  - RIGHT room menu: appears only during the interior tour; the current room highlights and
 *    clicking a room jumps to its scene.
 *
 * Scroll → progress math mirrors ScrollTrigger's mapping exactly (spacer 'top top' → 'bottom
 * bottom'): progress = (scrollY - spacerTop) / (spacerHeight - viewportHeight). The HUD reads the
 * DOM only (no three.js imports) so it stays in the light bundle and never re-renders on the
 * three.js render path; the progress line is written directly to the DOM outside React state.
 */

const CHAPTERS = [
  { scene: 1, label: 'Start' },
  { scene: 2, label: 'Foundation' },
  { scene: 3, label: 'Structure' },
  { scene: 4, label: 'Exterior' },
  { scene: 5, label: 'Gate' },
  { scene: 6, label: 'Living' },
  { scene: 7, label: 'Kitchen' },
  { scene: 8, label: 'Guest suite' },
  { scene: 9, label: 'Master' },
  { scene: 10, label: 'Washroom' },
  { scene: 11, label: 'Bedroom' },
  { scene: 12, label: 'Terrace' },
  { scene: 13, label: 'Reveal' },
] as const;

/** Interior tour rooms (reference's right-side menu), mapped to their actual scene ids. */
const ROOMS = [
  { scene: 6, label: 'Living room' },
  { scene: 7, label: 'Kitchen' },
  { scene: 8, label: 'Guest suite' },
  { scene: 9, label: 'Master bedroom' },
  { scene: 10, label: 'Washroom' },
  { scene: 11, label: 'Bedroom two' },
  { scene: 12, label: 'Terrace' },
] as const;

function spacerEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-cinematic-spacer]');
}

function sceneScrollTarget(scene: number): number | null {
  const el = spacerEl();
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const range = Math.max(1, el.offsetHeight - window.innerHeight);
  // Land mid-caption (captions fade in at scene+0.64): scene start + 70% of its window.
  return top + ((scene - 1 + 0.7) / SCENE_COUNT) * range;
}

export function CinematicHud() {
  const [active, setActive] = useState(0); // 0-based scene index
  const [after, setAfter] = useState(false); // scrolled past the walkthrough → HUD fades away
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = spacerEl();
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, el.offsetHeight - window.innerHeight);
      const y = window.scrollY;
      const p = Math.min(1, Math.max(0, (y - top) / range));
      if (fillRef.current) fillRef.current.style.height = `${(p * 100).toFixed(2)}%`;
      setActive(y <= top ? 0 : Math.min(SCENE_COUNT - 1, Math.floor(p * SCENE_COUNT)));
      setAfter(y > top + range + window.innerHeight * 0.35);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const seek = (scene: number) => {
    const target = sceneScrollTarget(scene);
    if (target == null) return;
    const win = window as unknown as { __fardeenScrollTo?: (y: number) => void };
    if (win.__fardeenScrollTo) win.__fardeenScrollTo(target);
    else window.scrollTo({ top: target, behavior: 'smooth' });
  };

  const interior = active >= 5 && active <= 11; // scene ids 6..12

  return (
    <>
      {/* Left numbered chapter rail. */}
      <nav
        aria-label="Walkthrough chapters"
        className={`fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 transition-opacity duration-500 lg:block xl:left-6 ${
          after ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="relative flex flex-col gap-[0.42rem] py-1 pl-4">
          <div className="absolute bottom-2 left-0 top-2 w-px bg-gold/15">
            <div ref={fillRef} className="w-px bg-gold shadow-[0_0_8px_rgba(200,161,90,0.55)]" style={{ height: '0%' }} />
          </div>
          {CHAPTERS.map((c, i) => {
            const on = i === active;
            return (
              <button
                key={c.scene}
                type="button"
                onClick={() => seek(c.scene)}
                aria-label={`Go to chapter ${c.scene}: ${c.label}`}
                aria-current={on ? 'step' : undefined}
                className="group flex items-center gap-2.5 text-left"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 ${
                    i <= active ? 'bg-gold shadow-[0_0_6px_rgba(200,161,90,0.7)]' : 'bg-gold/25'
                  }`}
                />
                <span
                  className={`font-display text-[0.72rem] font-semibold tabular-nums tracking-[0.14em] transition-colors duration-300 ${
                    on ? 'text-gold' : 'text-muted/50 group-hover:text-gold-light'
                  }`}
                >
                  {String(c.scene).padStart(2, '0')}
                </span>
                <span
                  className={`text-[0.55rem] uppercase tracking-[0.2em] transition-colors duration-300 ${
                    on ? 'text-foreground' : 'text-muted/40 group-hover:text-muted'
                  }`}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right room menu — interior tour only. */}
      <nav
        aria-label="Rooms"
        aria-hidden={!interior || after}
        className={`fixed right-5 top-1/2 z-30 hidden w-44 -translate-y-1/2 transition-opacity duration-500 lg:block ${
          interior && !after ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="rounded-lg border border-gold/20 bg-surface/85 p-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          {ROOMS.map((r) => {
            const on = active === r.scene - 1;
            return (
              <button
                key={r.scene}
                type="button"
                onClick={() => seek(r.scene)}
                tabIndex={interior && !after ? 0 : -1}
                className={`flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-[0.58rem] uppercase tracking-[0.18em] transition-colors duration-200 ${
                  on ? 'bg-gold/15 text-gold' : 'text-muted hover:bg-gold/5 hover:text-foreground'
                }`}
              >
                {r.label}
                <span aria-hidden="true" className={on ? 'text-gold' : 'text-gold/50'}>
                  ›
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
