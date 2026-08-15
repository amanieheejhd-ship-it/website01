'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createDirector } from '../../lib/cinematic/director';
import { createPipeline, type Pipeline } from '../../lib/cinematic/pipeline';
import { SCENE_COUNT, SCENES } from '../../lib/cinematic/scenes';
import { createWorld, enrichWorld } from '../../lib/cinematic/world';

const CINEMATIC_BUILD_SIGNATURE = 'upper-left-private-suite-facade-v2';

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
  const [loading, setLoading] = useState(true);

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
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.76;
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
      __fardeenBenchmark?: (durationMs?: number) => Promise<unknown>;
      __fardeenInteriorState?: () => Record<string, boolean>;
      __fardeenVisibilityState?: () => Record<string, unknown>;
      __fardeenCameraState?: () => {
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
      };
      __fardeenSetCamera?: (pose: {
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
      }) => void;
    };
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

    win.__fardeenBuildSignature = CINEMATIC_BUILD_SIGNATURE;
    win.__fardeenSeek = director.seek; // verification seam
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
      pipeline.setSize(window.innerWidth, window.innerHeight);
      ScrollTrigger.refresh();
      invalidate();
    };
    window.addEventListener('resize', onResize);
    invalidate();

    return () => {
      disposed = true;
      delete win.__fardeenBuildSignature;
      delete win.__fardeenSeek;
      delete win.__fardeenBenchmark;
      delete win.__fardeenInteriorState;
      delete win.__fardeenVisibilityState;
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
      style={{ height: `${SCENE_COUNT * 80}vh` }}
      data-cinematic-spacer
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        <div
          className={`pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/70 transition-opacity duration-500 ${loading ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden="true"
        >
          <span className="font-display text-xs uppercase tracking-[0.32em] text-gold/80">
            Preparing the estate
          </span>
        </div>

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
