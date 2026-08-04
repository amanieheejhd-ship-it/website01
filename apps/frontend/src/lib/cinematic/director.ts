import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { OPENING_CAMERA, PALETTE, SCENES } from './scenes';
import type { WorldHandles } from './world';

const WARM_STONE = new THREE.Color(0xb9a681);
const rgb = (hex: number) => {
  const c = new THREE.Color(hex);
  return { r: c.r, g: c.g, b: c.b };
};

/**
 * Builds the ONE scrubbed GSAP timeline. Every tween writes directly to three.js objects (camera,
 * materials, transforms) or the DOM copy overlay. ScrollTrigger reads Lenis-smoothed scroll and
 * calls `invalidate()` each update so the demand loop renders exactly one frame per scrub tick.
 * Nothing here re-renders React.
 */
export function createDirector(opts: {
  camera: THREE.PerspectiveCamera;
  handles: WorldHandles;
  lookTarget: THREE.Vector3;
  spacer: HTMLElement;
  copyEls: HTMLElement[];
  invalidate: () => void;
}): { seek: (p: number) => void; dispose: () => void } {
  const { camera, handles, lookTarget, spacer, copyEls, invalidate } = opts;
  const { env, villa } = handles;

  // Initial camera + look target + palette (dawn).
  camera.position.set(OPENING_CAMERA.pos.x, OPENING_CAMERA.pos.y, OPENING_CAMERA.pos.z);
  lookTarget.set(OPENING_CAMERA.target.x, OPENING_CAMERA.target.y, OPENING_CAMERA.target.z);
  env.skyMat.uniforms.uTop.value.set(PALETTE.skyTop[0]);
  env.skyMat.uniforms.uBottom.value.set(PALETTE.skyBottom[0]);
  env.fog.color.set(PALETTE.fog[0]);
  env.sun.color.set(PALETTE.light[0]);
  env.ambient.color.set(PALETTE.light[0]);
  gsap.set(copyEls, { autoAlpha: 0, y: 16 });

  let master: gsap.core.Timeline | null = null;
  const ctx = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { ease: 'power1.inOut' },
      scrollTrigger: {
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: () => invalidate(),
      },
    });
    master = tl;

    // Camera path: OPENING → each scene keyframe over its 1-unit window.
    SCENES.forEach((s, idx) => {
      tl.to(camera.position, { ...s.camera.pos, duration: 1, ease: s.ease }, idx);
      tl.to(lookTarget, { ...s.camera.target, duration: 1, ease: s.ease }, idx);
    });

    // Palette shifts (dawn → warm → golden → evening).
    PALETTE.stops.forEach((sceneIdx, si) => {
      if (si === 0) return;
      const at = PALETTE.stops[si - 1];
      const dur = sceneIdx - PALETTE.stops[si - 1];
      tl.to(env.skyMat.uniforms.uTop.value, { ...rgb(PALETTE.skyTop[si]), duration: dur }, at);
      tl.to(env.skyMat.uniforms.uBottom.value, { ...rgb(PALETTE.skyBottom[si]), duration: dur }, at);
      tl.to(env.fog.color, { ...rgb(PALETTE.fog[si]), duration: dur }, at);
      tl.to(env.sun.color, { ...rgb(PALETTE.light[si]), duration: dur }, at);
      tl.to(env.ambient.color, { ...rgb(PALETTE.light[si]), duration: dur }, at);
    });
    tl.to(handles.terrainMat.color, { ...rgb(0x2e2a1e), duration: 3 }, 2);

    // Scene 2 [1,2]: foundation pour + rebar.
    tl.fromTo(villa.slab.scale, { y: 0 }, { y: 1, duration: 0.5, ease: 'power2.out' }, 1.05);
    tl.fromTo(villa.rebar.scale, { y: 0 }, { y: 1, duration: 0.5, ease: 'back.out(2)' }, 1.4);

    // Scene 3 [2,3]: structure rises.
    villa.columns.forEach((c, i) => {
      tl.to(c.scale, { y: 1, duration: 0.45, ease: 'back.out(1.6)' }, 2.05 + i * 0.06);
    });
    villa.walls.forEach((w, i) => {
      tl.to(w.scale, { y: 1, duration: 0.5, ease: 'elastic.out(1,0.65)' }, 2.15 + i * 0.07);
    });
    tl.to(villa.upper.scale, { y: 1, duration: 0.5, ease: 'power3.out' }, 2.55);
    tl.set(villa.roof, { visible: true }, 2.55);
    tl.fromTo(villa.roof.position, { y: 10.5 }, { y: 6.1, duration: 0.4, ease: 'bounce.out' }, 2.6);

    // Scene 4 [3,4]: shell → villa (warm tint + cladding + glass + emissive windows).
    villa.shellMats.forEach((m) => {
      tl.to(m.color, { r: WARM_STONE.r, g: WARM_STONE.g, b: WARM_STONE.b, duration: 0.7 }, 3.05);
    });
    tl.set(villa.windowMesh, { visible: true }, 3.0);
    tl.to(villa.claddingMat, { opacity: 1, duration: 0.6 }, 3.1);
    tl.to(villa.glassMat, { opacity: 0.9, duration: 0.6 }, 3.2);
    tl.to(villa.windowMat, { emissiveIntensity: 1.4, duration: 0.7 }, 3.25);

    // Scene 5 [4,5]: gate appears + opens.
    tl.set(handles.gate.group, { visible: true }, 4.0);
    tl.to(handles.gate.left.rotation, { y: -Math.PI * 0.62, duration: 0.6, ease: 'power2.inOut' }, 4.2);
    tl.to(handles.gate.right.rotation, { y: Math.PI * 0.62, duration: 0.6, ease: 'power2.inOut' }, 4.2);

    // Scenes 6–9 [5,9]: interior warms.
    tl.set(villa.interior, { visible: true }, 5.0);
    tl.to(villa.interiorLight, { intensity: 2.4, duration: 0.5 }, 5.1);
    tl.to(villa.windowMat, { emissiveIntensity: 1.8, duration: 1 }, 5.5);

    // Scene 10 [9,10]: leave interior.
    tl.to(villa.interiorLight, { intensity: 0.5, duration: 0.5 }, 9.1);
    tl.set(villa.interior, { visible: false }, 9.7);

    // Scene 11 [10,11]: full glow reveal.
    tl.to(villa.windowMat, { emissiveIntensity: 2.6, duration: 0.8 }, 10.15);

    // Copy overlay: fade each scene label in over its window, out near the end.
    SCENES.forEach((s, idx) => {
      const el = copyEls[idx];
      if (!el || (!s.title && !s.eyebrow)) return;
      tl.fromTo(el, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' }, idx + 0.18);
      tl.to(el, { autoAlpha: 0, y: -14, duration: 0.22, ease: 'power2.in' }, idx + 0.78);
    });
  });

  ScrollTrigger.refresh();
  invalidate();

  return {
    seek: (p: number) => {
      master?.progress(THREE.MathUtils.clamp(p, 0, 1));
      invalidate();
    },
    dispose: () => ctx.revert(),
  };
}
