'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/use-reduced-motion';

/**
 * Scroll-scrubbed frame-sequence player — the HYBRID cinematic path (see
 * `public/cinematic/walkthrough/README.md`). A pre-rendered photoreal walkthrough (Blender Cycles /
 * UE5 offline render / purchased archviz clip) is exported to a numbered JPEG/WebP frame sequence;
 * this component pins a canvas and draws the frame that matches scroll progress. Unlike the real-time
 * three.js scene it uses ~zero GPU budget (one `drawImage` per changed frame), so it holds a smooth
 * scrub on weak hardware where a live 4K-PBR walkthrough cannot run.
 *
 * Guardrails mirror the WebGL path: SSR-safe (client-only, canvas painted in an effect), and
 * reduced-motion → a single static poster frame (no scrub) instead of motion. Frames are lazy: nothing
 * is fetched until this mounts (gate it behind interaction like `CinematicMount` when wiring it in).
 *
 * NOT yet wired into the homepage — kept standalone pending review of the hybrid direction.
 */
export interface WalkthroughScrubberProps {
  /** Number of frames in the sequence. */
  frameCount: number;
  /** Public base path + filename prefix, e.g. `/cinematic/walkthrough/frames/frame_`. */
  basePath: string;
  /** Zero-pad width of the frame index (frame_000 → 3). */
  pad?: number;
  /** File extension without dot. */
  ext?: 'jpg' | 'webp' | 'png';
  /** Viewport-heights of scroll per frame — controls scrub length / pacing. */
  perFrameVh?: number;
  /** Optional captions keyed by frame index, rendered over the canvas. */
  captions?: Record<number, string>;
}

const framePath = (base: string, i: number, pad: number, ext: string): string =>
  `${base}${String(i).padStart(pad, '0')}.${ext}`;

export function WalkthroughScrubber({
  frameCount,
  basePath,
  pad = 3,
  ext = 'jpg',
  perFrameVh = 60,
  captions,
}: WalkthroughScrubberProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('');

  // Preload the sequence, then reveal. On reduced-motion we still preload the first frame only.
  useEffect(() => {
    let cancelled = false;
    const count = reducedMotion ? 1 : frameCount;
    const imgs: HTMLImageElement[] = [];
    let done = 0;
    for (let i = 0; i < count; i++) {
      const img = new Image();
      img.onload = img.onerror = () => {
        done += 1;
        if (!cancelled) setProgress(done / count);
        if (done === count && !cancelled) setReady(true);
      };
      img.src = framePath(basePath, i, pad, ext);
      imgs[i] = img;
    }
    framesRef.current = imgs;
    return () => {
      cancelled = true;
    };
  }, [frameCount, basePath, pad, ext, reducedMotion]);

  // Draw + scroll wiring (skipped under reduced-motion, which shows the static poster instead).
  useEffect(() => {
    if (!ready || reducedMotion) return;
    const canvas = canvasRef.current;
    const track = trackRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !track || !ctx) return;

    const fit = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    const drawIndex = (idx: number): void => {
      const img = framesRef.current[idx];
      if (!img) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    let cur = -1;
    let raf = 0;
    const loop = (): void => {
      const rect = track.getBoundingClientRect();
      const max = track.offsetHeight - window.innerHeight;
      const p = max > 0 ? Math.min(Math.max(-rect.top / max, 0), 1) : 0;
      const idx = Math.min(frameCount - 1, Math.round(p * (frameCount - 1)));
      if (idx !== cur) {
        cur = idx;
        drawIndex(idx);
        setProgress(p);
        if (captions?.[idx] !== undefined) setCaption(captions[idx]);
      }
      raf = requestAnimationFrame(loop);
    };
    fit();
    drawIndex(0);
    raf = requestAnimationFrame(loop);
    const onResize = (): void => {
      fit();
      drawIndex(cur < 0 ? 0 : cur);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [ready, reducedMotion, frameCount, captions]);

  // Reduced-motion: a single static hero poster, no scroll track, no scrub.
  if (reducedMotion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={framePath(basePath, 0, pad, ext)}
        alt="Fardeen villa walkthrough"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    );
  }

  return (
    <div ref={trackRef} style={{ position: 'relative', height: `${frameCount * perFrameVh}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%', overflow: 'hidden', background: '#000' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        {caption && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '12%',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.04em',
              color: 'rgba(245,245,244,0.92)',
              textShadow: '0 2px 18px rgba(0,0,0,0.6)',
              fontSize: 'clamp(1.1rem, 2.4vw, 1.8rem)',
              pointerEvents: 'none',
            }}
          >
            {caption}
          </div>
        )}
        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0a0a0a' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.34em', textTransform: 'uppercase', fontSize: '0.72rem', color: '#c8a15a' }}>
                Fardeen · Walkthrough
              </div>
              <div style={{ width: 220, height: 2, background: 'rgba(255,255,255,0.12)', margin: '18px auto 0' }}>
                <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: '#c8a15a', transition: 'width 0.15s linear' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
