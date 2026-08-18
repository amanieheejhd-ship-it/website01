'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SCENE_CAPTIONS } from '../../lib/cinematic/captions';
import { createDirector } from '../../lib/cinematic/director';
import { createPipeline, type Pipeline } from '../../lib/cinematic/pipeline';
import { SCENE_COUNT, SCENES, sceneScrollVh } from '../../lib/cinematic/scenes';
import { createWorld, enrichWorld } from '../../lib/cinematic/world';

/** Touch devices scrub a shorter spacer (less thumb travel for the same story). */
const coarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const CINEMATIC_BUILD_SIGNATURE = 'upper-left-private-suite-facade-v2';

/**
 * The pinned cinematic canvas — raw three.js (no react-reconciler). A tall scroll spacer holds a
 * sticky, viewport-filling <canvas>; scroll scrubs the director's GSAP timeline. Lenis is the sole
 * scroll authority (its RAF is the single gsap.ticker) and drives ScrollTrigger.update. The
 * WebGLRenderer renders on demand — one frame per scrub tick — so it's idle when not scrolling.
 * Decorative (aria-hidden): every word of copy also lives in the static DOM sections below.
 */
export default function CinematicExperience({ onTooSlow }: { onTooSlow?: () => void } = {}) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const onTooSlowRef = useRef(onTooSlow);
  onTooSlowRef.current = onTooSlow;

  useEffect(() => {
    const canvas = canvasRef.current;
    const spacer = spacerRef.current;
    const copyContainer = copyRef.current;
    if (!canvas || !spacer) return;

    gsap.registerPlugin(ScrollTrigger);

    // MOBILE PROFILE: phones/tablets run the same walkthrough with a strict cost budget — DPR 1,
    // no post-processing / no shadows (lowest pipeline tier), fewer heavy instances, fog pulled in
    // to cut draw distance, and a wider portrait FOV so rooms still frame well.
    const mobileProfile =
      window.innerWidth < 1024 || window.matchMedia('(pointer: coarse)').matches;

    const world = createWorld();
    const lookTarget = new THREE.Vector3(0, 1.2, 0);
    if (mobileProfile) {
      (world.handles.env.fog as THREE.FogExp2).density *= 1.7;
      world.scene.traverse((object) => {
        // Only the big decorative fields (grass ≥ 200 instances) — structural instanced meshes
        // (rebar, window grid) keep their full counts.
        if (object instanceof THREE.InstancedMesh && object.count >= 200) {
          object.count = Math.floor(object.count * 0.4);
        }
      });
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobileProfile,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(mobileProfile ? 1 : Math.min(1.5, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.76;
    renderer.shadowMap.enabled = !mobileProfile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const hostSize = () => {
      // Measure the sticky host (100svh) rather than window.innerHeight: on phones the address-bar
      // collapse changes innerHeight but NOT svh, so the canvas never jumps mid-scroll.
      const host = canvas.parentElement;
      return {
        w: host?.clientWidth || window.innerWidth,
        h: host?.clientHeight || window.innerHeight,
      };
    };
    const isPortrait = () => {
      const { w, h } = hostSize();
      return w / h < 0.75;
    };
    const setSize = () => {
      const { w, h } = hostSize();
      renderer.setSize(w, h, false);
      const aspect = w / h;
      world.camera.aspect = aspect;
      // Widen the vertical FOV as the frame narrows so the horizontal field doesn't collapse —
      // paired with the director's per-scene portrait dolly-back (PORTRAIT_TWEAKS) this keeps every
      // scene's subject inside the upright frame without fisheye distortion.
      world.camera.fov = aspect < 0.75 ? 66 : aspect < 1 ? 56 : 48;
      world.camera.updateProjectionMatrix();
    };
    setSize();

    // ---- demand render loop (one frame per scrub tick) ----
    const clock = new THREE.Clock();
    let sampledFrames = 0;
    let renderCostMs = 0;
    let fps = 0;
    let renderReq = false;
    let disposed = false;
    let inViewport = false;
    let tabVisible = !document.hidden;
    let pipeline: Pipeline | null = null;
    const win = window as unknown as {
      __fardeenPerf?: unknown;
      __fardeenBuildSignature?: string;
      __fardeenSeek?: (p: number) => void;
      __fardeenScrollTo?: (y: number) => void;
      __fardeenBenchmark?: (durationMs?: number) => Promise<unknown>;
      __fardeenInteriorState?: () => Record<string, boolean>;
      __fardeenVisibilityState?: () => Record<string, unknown>;
      __fardeenSceneQuery?: (
        min: { x: number; y: number; z: number },
        max: { x: number; y: number; z: number },
      ) => unknown[];
      __fardeenCameraState?: () => {
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
      };
      __fardeenSetCamera?: (pose: {
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
      }) => void;
    };
    let lowFpsWindows = 0;
    let slowReported = false;
    const render = () => {
      renderReq = false;
      if (!pipeline) return;
      world.updateAmbient(clock.getElapsedTime());
      world.camera.lookAt(lookTarget);
      const renderStarted = performance.now();
      pipeline.render(); // ACES + IBL + SSAO/bloom/vignette (or direct render when degraded)
      renderCostMs += performance.now() - renderStarted;
      sampledFrames += 1;
      if (sampledFrames >= 30) {
        fps = Math.round(1000 / Math.max(1, renderCostMs / sampledFrames));
        sampledFrames = 0;
        renderCostMs = 0;
        pipeline.adapt(fps); // drop a quality tier on sustained low fps rather than freeze
        // Safety net: already at the lowest tier and STILL under ~24fps for 3 consecutive windows →
        // report up so the mount swaps to the static navigator. Skipped under automation
        // (navigator.webdriver) so headless verification never falls back mid-test.
        if (!(navigator as { webdriver?: boolean }).webdriver && pipeline.tier() >= 2 && fps < 24) {
          lowFpsWindows += 1;
          if (lowFpsWindows >= 3 && !slowReported) {
            slowReported = true;
            onTooSlowRef.current?.();
          }
        } else if (fps >= 24) {
          lowFpsWindows = 0;
        }
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
      if (inViewport && tabVisible && !renderReq) {
        renderReq = true;
        requestAnimationFrame(render);
      }
    };

    pipeline = createPipeline(renderer, world.scene, world.camera, invalidate);
    if (mobileProfile) {
      // Force the lowest quality tier up front (direct render, no post, no shadows, DPR 1) —
      // the same tier the adaptive pipeline would eventually reach on a weak device.
      for (let i = 0; i < 6; i += 1) pipeline.adapt(1);
    }
    win.__fardeenBenchmark = (durationMs = 1500) => {
      // Exercise the exact weak-device fallback before sampling. Production reaches this tier after
      // three sustained low-FPS windows; the verification seam compresses those windows.
      for (let i = 0; i < 6; i += 1) pipeline?.adapt(1);
      return new Promise((resolve) => {
        const started = performance.now();
        let sampledFrames = 0;
        const sample = () => {
          world.updateAmbient(clock.getElapsedTime());
          world.camera.lookAt(lookTarget);
          pipeline?.render();
          sampledFrames += 1;
          const elapsed = performance.now() - started;
          if (elapsed < durationMs) requestAnimationFrame(sample);
          else {
            const result = {
              fps: Math.round((sampledFrames * 1000) / elapsed),
              dpr: renderer.getPixelRatio(),
              drawCalls: renderer.info.render.calls,
              triangles: renderer.info.render.triangles,
              tier: pipeline?.tier() ?? 0,
              sampleMs: Math.round(elapsed),
            };
            win.__fardeenPerf = result;
            resolve(result);
          }
        };
        requestAnimationFrame(sample);
      });
    };
    const loadingDeadline = new Promise<void>((resolve) => window.setTimeout(resolve, 8000));
    void Promise.race([enrichWorld(world, renderer, invalidate), loadingDeadline]).finally(() => {
      if (!disposed) setLoading(false);
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        if (inViewport) invalidate();
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(spacer);
    const onVisibilityChange = () => {
      tabVisible = !document.hidden;
      if (tabVisible) invalidate();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

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
    // HUD seam: the chapter rail / room menu scroll through Lenis (the sole scroll authority) so a
    // programmatic jump scrubs the timeline exactly like a user scroll.
    win.__fardeenScrollTo = (y: number) => lenis.scrollTo(y, { duration: 1.4 });

    const copyEls = copyContainer
      ? Array.from(copyContainer.querySelectorAll<HTMLElement>('[data-scene-copy]'))
      : [];

    let directorPortrait = isPortrait();
    const buildDirector = () =>
      createDirector({
        camera: world.camera,
        handles: world.handles,
        lookTarget,
        spacer,
        copyEls,
        invalidate,
        portrait: directorPortrait,
      });
    let director = buildDirector();
    // Rotating the phone flips the framing profile: rebuild the timeline with the other set of
    // baked camera keys (rare event — the scrubbed timeline re-syncs to the scroll position).
    const rebuildDirectorIfNeeded = () => {
      const portraitNow = isPortrait();
      if (portraitNow === directorPortrait) return;
      directorPortrait = portraitNow;
      director.dispose();
      director = buildDirector();
    };

    win.__fardeenBuildSignature = CINEMATIC_BUILD_SIGNATURE;
    win.__fardeenSeek = (p: number) => director.seek(p); // verification seam
    win.__fardeenInteriorState = () => Object.fromEntries(
      Object.entries(world.handles.villa.rooms).map(([name, room]) => [name, room.visible]),
    );
    win.__fardeenVisibilityState = () => {
      const facade = world.handles.villa.upperLeftFacade;
      const bounds = new THREE.Box3().setFromObject(facade);
      const materials = new Map<string, {
        name: string;
        type: string;
        opacity: number;
        transparent: boolean;
      }>();
      let meshCount = 0;
      let minRenderOrder = Number.POSITIVE_INFINITY;
      let maxRenderOrder = Number.NEGATIVE_INFINITY;
      facade.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshCount += 1;
        minRenderOrder = Math.min(minRenderOrder, object.renderOrder);
        maxRenderOrder = Math.max(maxRenderOrder, object.renderOrder);
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        meshMaterials.forEach((material) => {
          const key = material.uuid;
          if (!materials.has(key)) {
            materials.set(key, {
              name: material.name || '(unnamed)',
              type: material.type,
              opacity: material.opacity,
              transparent: material.transparent,
            });
          }
        });
      });
      const effectivelyVisible = (object: THREE.Object3D): boolean => {
        let current: THREE.Object3D | null = object;
        while (current) {
          if (!current.visible) return false;
          current = current.parent;
        }
        return true;
      };
      const progress = director.progress();
      const sceneIndex = Math.min(SCENE_COUNT, Math.floor(progress * SCENE_COUNT) + 1);
      const rooms = win.__fardeenInteriorState?.() ?? {};
      return {
        signature: CINEMATIC_BUILD_SIGNATURE,
        progress,
        timelineTime: director.time(),
        sceneIndex,
        slab: world.handles.villa.slab.visible,
        rebar: world.handles.villa.rebar.visible,
        walls: world.handles.villa.walls.some((wall) => wall.visible),
        columns: world.handles.villa.columns.some((column) => column.visible),
        upper: world.handles.villa.upper.visible,
        upperMass: world.handles.villa.upper.visible,
        roof: world.handles.villa.roof.visible,
        finishes: world.handles.villa.finishes.visible,
        exteriorShell: world.handles.villa.exteriorShell.visible,
        exteriorFacadeVisible: effectivelyVisible(facade),
        upperLeftFacade: {
          exists: true,
          uuid: facade.uuid,
          name: facade.name,
          visible: facade.visible,
          effectivelyVisible: effectivelyVisible(facade),
          parent: facade.parent?.name ?? null,
          parentVisible: facade.parent?.visible ?? null,
          position: { x: facade.position.x, y: facade.position.y, z: facade.position.z },
          rotation: { x: facade.rotation.x, y: facade.rotation.y, z: facade.rotation.z },
          scale: { x: facade.scale.x, y: facade.scale.y, z: facade.scale.z },
          bounds: {
            min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
            max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
          },
          meshCount,
          renderOrder: {
            min: Number.isFinite(minRenderOrder) ? minRenderOrder : null,
            max: Number.isFinite(maxRenderOrder) ? maxRenderOrder : null,
          },
          materials: [...materials.values()],
        },
        windows: world.handles.villa.windowMesh.visible,
        developedSite: world.handles.site.developed.visible,
        gate: world.handles.gate.group.visible,
        interior: world.handles.villa.interior.visible,
        furniture: world.handles.villa.furnitureGroup.visible,
        bedroomCutaway: world.handles.villa.interior.visible && Boolean(rooms.master),
        rooms,
      };
    };
    // Verification seam: list meshes whose bounds intersect a world-space AABB (used by the visual
    // acceptance harness to locate stray/floating geometry precisely).
    win.__fardeenSceneQuery = (min, max) => {
      const queryBox = new THREE.Box3(
        new THREE.Vector3(min.x, min.y, min.z),
        new THREE.Vector3(max.x, max.y, max.z),
      );
      const hits: unknown[] = [];
      world.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.visible) return;
        const bounds = new THREE.Box3().setFromObject(object);
        if (!queryBox.intersectsBox(bounds)) return;
        const chain: string[] = [];
        let current: THREE.Object3D | null = object;
        while (current) {
          chain.unshift(current.name || current.type);
          current = current.parent;
        }
        const size = new THREE.Vector3();
        bounds.getSize(size);
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        hits.push({
          chain: chain.join('>'),
          geometry: object.geometry.type,
          center: { x: +center.x.toFixed(2), y: +center.y.toFixed(2), z: +center.z.toFixed(2) },
          size: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) },
        });
      });
      return hits;
    };
    win.__fardeenCameraState = () => ({
      position: { x: world.camera.position.x, y: world.camera.position.y, z: world.camera.position.z },
      target: { x: lookTarget.x, y: lookTarget.y, z: lookTarget.z },
    });
    // Read/write camera seams let the visual acceptance harness inspect architectural geometry from
    // required off-timeline angles (notably the front-left facade) without changing story cameras.
    win.__fardeenSetCamera = ({ position, target }) => {
      world.camera.position.set(position.x, position.y, position.z);
      lookTarget.set(target.x, target.y, target.z);
      invalidate();
    };

    const onResize = () => {
      setSize();
      const { w, h } = hostSize();
      pipeline.setSize(w, h);
      rebuildDirectorIfNeeded();
      ScrollTrigger.refresh();
      invalidate();
    };
    window.addEventListener('resize', onResize);
    invalidate();

    return () => {
      disposed = true;
      delete win.__fardeenBuildSignature;
      delete win.__fardeenSeek;
      delete win.__fardeenScrollTo;
      delete win.__fardeenBenchmark;
      delete win.__fardeenInteriorState;
      delete win.__fardeenVisibilityState;
      delete win.__fardeenSceneQuery;
      delete win.__fardeenCameraState;
      delete win.__fardeenSetCamera;
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
      style={{ height: `${SCENE_COUNT * sceneScrollVh(coarsePointer())}vh` }}
      data-cinematic-spacer
    >
      {/* svh keeps the pinned viewport stable on phones (no address-bar jump); browsers without
          svh ignore the inline style and use the h-screen class. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden" style={{ height: '100svh' }}>
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        <div
          className={`pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/70 transition-opacity duration-500 ${loading ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden="true"
        >
          <span className="font-display text-xs uppercase tracking-[0.32em] text-gold/80">
            Preparing the estate
          </span>
        </div>

        {/* Copy overlay — reference-style caption cards (big gold number, two-line headline, gold
            rule, short copy), left-aligned clear of the chapter rail. GSAP tweens the inner
            [data-scene-copy] element per scene; the outer wrapper owns the static positioning so the
            tweened y-transform never fights a CSS translate. Decorative for AT. */}
        <div ref={copyRef} className="pointer-events-none absolute inset-0">
          {SCENES.map((s) => {
            const cap = SCENE_CAPTIONS[s.id];
            return (
              <div
                key={s.id}
                className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+4rem)] lg:inset-x-auto lg:bottom-auto lg:left-[clamp(11rem,13vw,14rem)] lg:top-1/2 lg:w-full lg:max-w-md lg:-translate-y-1/2 lg:pr-6"
              >
                {/* Soft ink scrim keeps the card legible over bright interiors (no backdrop-blur —
                    that would force expensive canvas readback on every scrub frame). Mobile:
                    compact card, bottom-anchored above the fold gradient. */}
                <div
                  data-scene-copy
                  className="rounded-xl bg-[linear-gradient(90deg,rgba(10,10,10,0.72),rgba(10,10,10,0.4)_55%,transparent)] px-5 py-5 lg:-mx-7 lg:rounded-2xl lg:px-7 lg:py-7"
                  style={{ opacity: 0, visibility: 'hidden' }}
                >
                  <p className="font-display text-3xl font-semibold leading-none text-gold/90 [text-shadow:0_2px_14px_rgba(0,0,0,0.6)] lg:text-5xl">
                    {String(s.id).padStart(2, '0')}
                  </p>
                  <p className="mt-3 font-display text-2xl font-bold leading-[1.08] text-foreground [text-shadow:0_2px_16px_rgba(0,0,0,0.7)] lg:mt-4 lg:text-4xl">
                    {cap ? (
                      <>
                        {cap.lines[0]}
                        <br />
                        {cap.lines[1]}
                      </>
                    ) : (
                      s.title
                    )}
                  </p>
                  <span className="mt-3 block h-px w-16 bg-gold/70 lg:mt-5" />
                  <p className="mt-3 max-w-xs text-xs leading-relaxed text-foreground/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] lg:mt-5 lg:text-sm">
                    {cap?.body ?? s.eyebrow}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/60 to-transparent" />
      </div>
    </div>
  );
}
