'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SCENE_COUNT } from '../../lib/cinematic/scenes';

/**
 * "Watch our story" — a circular gold play affordance that glides into the walkthrough and then
 * AUTO-PLAYS the whole build story by driving the scroll position through the walkthrough's full
 * range with a rAF tween. Because the scrub timeline, captions and chapter rail are all functions
 * of scroll, they animate exactly as if a person were scrolling.
 *
 * Control stays with the user: any wheel / touch / pointer / key input cancels instantly (capture
 * phase, passive) and normal scrolling takes over; Escape and the floating Stop chip do the same.
 * prefers-reduced-motion → no auto-play, the button simply jumps to the walkthrough. On small
 * screens (3D gated off) it scrolls to the static room navigator instead. No new dependencies —
 * the driver is ~40 lines of rAF.
 */

/** Cinematic pacing (seconds). Interiors linger a little longer than the construction scenes. */
const LEAD_IN_S = 2.6;
const EXTERIOR_SCENE_S = 4.0;
const INTERIOR_SCENE_S = 5.2;
const INTERIOR_SCENES = new Set([6, 7, 8, 9, 10, 11, 12]); // scene ids toured indoors
// Total ≈ 2.6 + 6×4.0 + 7×5.2 ≈ 63s — inside the 45–75s cinematic window.

const CANCEL_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

interface Segment {
  from: number;
  to: number;
  duration: number; // seconds
}

export function WatchStoryButton() {
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    cleanupRef.current?.();
  }, []);

  const play = useCallback(() => {
    const spacer = document.querySelector<HTMLElement>('[data-cinematic-spacer]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!spacer || reduced) {
      // Fallback paths: static navigator (small screens) or a plain glide (reduced motion).
      const el = spacer ?? document.querySelector<HTMLElement>('[data-cinematic-static]');
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY + 2;
      const win = window as unknown as { __fardeenScrollTo?: (y: number) => void };
      if (!reduced && win.__fardeenScrollTo) win.__fardeenScrollTo(top);
      else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      return;
    }

    // Build the tour: a lead-in glide to the walkthrough, then one segment per scene.
    const top = spacer.getBoundingClientRect().top + window.scrollY;
    const range = Math.max(1, spacer.offsetHeight - window.innerHeight);
    const sceneY = (i: number) => top + (i / SCENE_COUNT) * range;
    const segments: Segment[] = [
      { from: window.scrollY, to: top, duration: LEAD_IN_S },
    ];
    for (let i = 0; i < SCENE_COUNT; i += 1) {
      segments.push({
        from: sceneY(i),
        to: sceneY(i + 1),
        duration: INTERIOR_SCENES.has(i + 1) ? INTERIOR_SCENE_S : EXTERIOR_SCENE_S,
      });
    }

    const cleanup = () => {
      cancelAnimationFrame(rafRef.current);
      CANCEL_EVENTS.forEach((ev) => window.removeEventListener(ev, onCancel, true));
      cleanupRef.current = null;
      setPlaying(false);
    };
    const onCancel = () => cleanup(); // any real input → user takes over instantly
    cleanupRef.current = cleanup;
    CANCEL_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onCancel, { capture: true, passive: true }),
    );
    setPlaying(true);

    let segment = 0;
    let segmentStart = performance.now();
    const frame = (now: number) => {
      const active = segments[segment];
      const t = Math.min(1, (now - segmentStart) / (active.duration * 1000));
      const y = active.from + (active.to - active.from) * easeInOutSine(t);
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
      if (t >= 1) {
        segment += 1;
        segmentStart = now;
        if (segment >= segments.length) {
          cleanup();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  // Escape ends the tour (cancel listeners are passive; Escape is handled explicitly too so the
  // chip's advertised shortcut always works, even if a browser suppresses the generic keydown).
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, stop]);

  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <>
      <button
        type="button"
        onClick={play}
        className="group flex items-center gap-3 self-center rounded-full sm:self-auto"
        aria-label="Watch our story — play the full build walkthrough"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-gold/50 text-gold shadow-[0_0_24px_-8px_rgba(200,161,90,0.5)] transition-colors duration-200 group-hover:border-gold group-hover:bg-gold/10">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        </span>
        <span className="text-[0.62rem] uppercase tracking-[0.26em] text-muted transition-colors duration-200 group-hover:text-foreground">
          Watch
          <br />
          our story
        </span>
      </button>

      {/* Floating control chip — rendered ONLY while the tour is actually playing (never on the
          hero, never during normal scrolling; unmounts the instant auto-play stops). Compact on
          mobile (icon + "Stop"), full hint on larger screens; respects the safe area. */}
      {playing ? (
        <div
          role="status"
          className="fixed inset-x-0 z-40 flex justify-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          <button
            type="button"
            onClick={stop}
            aria-label="Stop the walkthrough tour"
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-gold/40 bg-surface/90 py-2 pl-3.5 pr-4 text-[0.6rem] uppercase tracking-[0.2em] text-foreground shadow-[0_16px_44px_-18px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-colors duration-200 hover:border-gold sm:gap-3 sm:pl-4 sm:pr-5"
          >
            <span aria-hidden="true" className="grid h-5 w-5 place-items-center text-gold">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="1.5" />
              </svg>
            </span>
            Stop
            <span className="hidden sm:inline">&nbsp;— or scroll to take control</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
