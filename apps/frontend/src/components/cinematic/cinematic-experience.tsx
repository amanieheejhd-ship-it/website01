'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createDirector } from '../../lib/cinematic/director';
import { createPipeline, type Pipeline } from '../../lib/cinematic/pipeline';
import { SCENE_COUNT, SCENES } from '../../lib/cinematic/scenes';
import { createWorld, enrichWorld } from '../../lib/cinematic/world';

/**
 * The pinned cinematic canvas — raw three.js (no react-reconciler). A tall scroll spacer holds a
 * sticky, viewport-filling <canvas>; scroll scrubs the director's GSAP timeline. Lenis is the sole
 * scroll authority (its RAF is the single gsap.ticker) and drives ScrollTrigger.update. The
 * WebGLRenderer renders on demand — one frame per scrub tick — so it's idle when not scrolling.
 * Decorative (aria-hidden): every word of copy also lives in the static DOM sections below.
 */
export default function CinematicExperience() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const spacer = spacerRef.current;
    const copyContainer = copyRef.current;
    if (!canvas || !spacer) return;

    gsap.registerPlugin(ScrollTrigger);

    const world = createWorld();
    const lookTarget = new THREE.Vector3(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); // DPR capped at 2
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const setSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      world.camera.aspect = w / h;
      world.camera.updateProjectionMatrix();
    };
    setSize();

    // ---- demand render loop (one frame per scrub tick) ----
    const clock = new THREE.Clock();
    let frames = 0;
    let lastFps = performance.now();
    let fps = 0;
    let renderReq = false;
    let pipeline: Pipeline | null = null;
    const win = window as unknown as { __fardeenPerf?: unknown; __fardeenSeek?: (p: number) => void };
    const render = () => {
      renderReq = false;
      if (!pipeline) return;
      world.updateAmbient(clock.getElapsedTime());
      world.camera.lookAt(lookTarget);
      pipeline.render(); // ACES + IBL + SSAO/bloom/vignette (or direct render when degraded)
      frames += 1;
      const now = performance.now();
      if (now - lastFps >= 500) {
        fps = Math.round((frames * 1000) / (now - lastFps));
        frames = 0;
        lastFps = now;
        pipeline.adapt(fps); // drop a quality tier on sustained low fps rather than freeze
        win.__fardeenPerf = {
          dpr: renderer.getPixelRatio(),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          tier: pipeline.tier(),
          fps,
        };
      }
    };
    const invalidate = () => {
      if (!renderReq) {
        renderReq = true;
        requestAnimationFrame(render);
      }
    };

    pipeline = createPipeline(renderer, world.scene, world.camera, invalidate);
    void enrichWorld(world, renderer, invalidate); // async: HDRI IBL + real PBR textures (never blocks LCP)

    // ---- Lenis (sole scroll authority) → single gsap.ticker → ScrollTrigger ----
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const copyEls = copyContainer
      ? Array.from(copyContainer.querySelectorAll<HTMLElement>('[data-scene-copy]'))
      : [];

    const director = createDirector({
      camera: world.camera,
      handles: world.handles,
      lookTarget,
      spacer,
      copyEls,
      invalidate,
    });

    win.__fardeenSeek = director.seek; // verification seam

    const onResize = () => {
      setSize();
      pipeline.setSize(window.innerWidth, window.innerHeight);
      ScrollTrigger.refresh();
      invalidate();
    };
    window.addEventListener('resize', onResize);
    invalidate();

    return () => {
      delete win.__fardeenSeek;
      window.removeEventListener('resize', onResize);
      director.dispose();
      pipeline.dispose();
      gsap.ticker.remove(raf);
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      world.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={spacerRef}
      aria-hidden="true"
      className="relative bg-background"
      style={{ height: `${SCENE_COUNT * 80}vh` }}
      data-cinematic-spacer
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

        {/* Copy overlay — GSAP tweens these per scene; static in the DOM, decorative for AT. */}
        <div ref={copyRef} className="pointer-events-none absolute inset-0">
          {SCENES.map((s) => (
            <div
              key={s.id}
              data-scene-copy
              className="absolute inset-x-0 bottom-[14vh] mx-auto max-w-2xl px-6 text-center"
              style={{ opacity: 0, visibility: 'hidden' }}
            >
              {s.eyebrow ? (
                <p className="font-display text-xs uppercase tracking-[0.3em] text-gold">{s.eyebrow}</p>
              ) : null}
              {s.title ? (
                <p className="mt-2 font-display text-3xl leading-tight text-foreground sm:text-4xl">
                  {s.title}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/60 to-transparent" />
      </div>
    </div>
  );
}
