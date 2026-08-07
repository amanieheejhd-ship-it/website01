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
  const { env, villa, site } = handles;

  // Initial camera + look target + palette (dawn).
  camera.position.set(OPENING_CAMERA.pos.x, OPENING_CAMERA.pos.y, OPENING_CAMERA.pos.z);
  lookTarget.set(OPENING_CAMERA.target.x, OPENING_CAMERA.target.y, OPENING_CAMERA.target.z);
  env.skyMat.uniforms.uTop.value.set(PALETTE.skyTop[0]);
  env.skyMat.uniforms.uBottom.value.set(PALETTE.skyBottom[0]);
  env.fog.color.set(PALETTE.fog[0]);
  env.sun.color.set(PALETTE.light[0]);
  env.ambient.color.set(PALETTE.light[0]);
  // Canonical progress-zero state. This is deliberately explicit so async PBR/model enrichment can
  // never flash a finished building before ScrollTrigger owns the scene.
  villa.slab.scale.y = 0;
  villa.slab.visible = false;
  villa.rebar.scale.y = 0;
  villa.rebar.visible = false;
  villa.walls.forEach((wall) => { wall.scale.y = 0; wall.visible = false; });
  villa.columns.forEach((column) => { column.scale.y = 0; column.visible = false; });
  villa.upper.scale.y = 0;
  villa.upper.visible = false;
  villa.roof.visible = false;
  villa.finishes.visible = false;
  villa.windowMesh.visible = false;
  villa.interior.visible = false;
  villa.furnitureGroup.visible = false;
  Object.values(villa.rooms).forEach((room) => { room.visible = false; });
  handles.gate.group.visible = false;
  site.developed.visible = false;
  gsap.set(copyEls, { autoAlpha: 0, y: 16 });

  let master: gsap.core.Timeline | null = null;
  const roomReveals: [THREE.Group, number][] = [
    [villa.rooms.foyer, 5],
    [villa.rooms.living, 6],
    [villa.rooms.dining, 7],
    [villa.rooms.kitchen, 8],
    [villa.rooms.powder, 9],
    [villa.rooms.stairs, 10],
    [villa.rooms.landing, 11],
    [villa.rooms.master, 12],
    [villa.rooms.secondBedroom, 13],
    [villa.rooms.masterBath, 14],
    [villa.rooms.terrace, 15],
  ];
  /**
   * Visibility is a pure function of the CURRENT timeline time. No historical latch is allowed:
   * down-scroll reveals additively, reverse-scroll removes in the exact opposite order, and t=0
   * always returns to terrain/grass/fog only. The exterior envelope's indoor cutaway is the sole
   * presentation exception; completed interior objects themselves remain threshold-only.
   */
  const applyVisibilityAt = (timelinePosition: number): void => {
    const indoorCutaway = timelinePosition >= 5 && timelinePosition < 15.4;
    villa.slab.visible = timelinePosition >= 1.04;
    // Rebar is temporary construction staging, not a completed interior/overview element. Retire it
    // once the finishes arrive so rods cannot pierce the furnished ground floor.
    villa.rebar.visible = timelinePosition >= 1.39 && timelinePosition < 3.75;
    villa.columns.forEach((column, index) => {
      column.visible = timelinePosition >= 2.04 + index * .06 && !indoorCutaway;
    });
    villa.walls.forEach((wall, index) => {
      wall.visible = timelinePosition >= 2.14 + index * .07 && !indoorCutaway;
    });
    villa.upper.visible = timelinePosition >= 2.54 && !indoorCutaway;
    villa.roof.visible = timelinePosition >= 2.55 && !indoorCutaway;
    villa.finishes.visible = timelinePosition >= 3 && !indoorCutaway;
    villa.windowMesh.visible = timelinePosition >= 3.12 && !indoorCutaway;
    site.developed.visible = timelinePosition >= 3.45;
    handles.gate.group.visible = timelinePosition >= 4;

    const interiorVisible = timelinePosition >= 5;
    villa.interior.visible = interiorVisible;
    villa.furnitureGroup.visible = interiorVisible;
    roomReveals.forEach(([room, threshold]) => {
      room.visible = timelinePosition >= threshold;
    });
  };
  const ctx = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { ease: 'power1.inOut' },
      scrollTrigger: {
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: invalidate,
      },
    });
    master = tl;

    // Camera path: OPENING → each scene keyframe over its 1-unit window.
    SCENES.forEach((s, idx) => {
      const route = s.route;
      if (route?.length) {
        let previousAt = 0;
        route.forEach((waypoint, waypointIndex) => {
          const duration = Math.max(.001, waypoint.at - previousAt);
          const ease = waypointIndex === route.length - 1 ? 'power1.out' : 'power1.inOut';
          tl.to(camera.position, { ...waypoint.pos, duration, ease }, idx + previousAt);
          tl.to(lookTarget, { ...waypoint.target, duration, ease }, idx + previousAt);
          previousAt = waypoint.at;
        });
      } else {
        // Arrive during the first part of the window, then hold a clean composed shot for its caption.
        tl.to(camera.position, { ...s.camera.pos, duration: 0.58, ease: s.ease }, idx);
        tl.to(lookTarget, { ...s.camera.target, duration: 0.58, ease: s.ease }, idx);
      }
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
    tl.fromTo(villa.roof.position, { y: 10.5 }, { y: 6.45, duration: 0.4, ease: 'bounce.out' }, 2.6);

    // Scene 4 [3,4]: shell → villa (warm tint + cladding + glass + emissive windows).
    villa.shellMats.forEach((m) => {
      tl.to(m.color, { r: WARM_STONE.r, g: WARM_STONE.g, b: WARM_STONE.b, duration: 0.7 }, 3.05);
    });
    tl.to(villa.claddingMat, { opacity: 1, duration: 0.6 }, 3.1);
    tl.to(villa.glassMat, { opacity: 0.9, duration: 0.6 }, 3.2);
    tl.to(villa.windowMat, { emissiveIntensity: 0.8, duration: 0.7 }, 3.25);

    // Scene 5 [4,5]: gate appears + opens.
    tl.to(handles.gate.left.rotation, { y: -Math.PI * 0.62, duration: 0.6, ease: 'power2.inOut' }, 4.2);
    tl.to(handles.gate.right.rotation, { y: Math.PI * 0.62, duration: 0.6, ease: 'power2.inOut' }, 4.2);

    // Scenes 6–9 [5,9]: interior warms.
    // Architectural cutaway: remove only the exterior envelope while the camera is indoors.
    tl.to(env.sun, { intensity: 0.58, duration: 0.45 }, 5.0);
    tl.to(villa.interiorLight, { intensity: 0.34, duration: 0.5 }, 5.1);
    tl.to(villa.windowMat, { emissiveIntensity: 1.05, duration: 1 }, 5.5);
    // Final exterior reveal; interior remains assembled behind the shell.
    tl.to(env.sun, { intensity: 2.7, duration: 0.45 }, 15.4);
    tl.to(villa.windowMat, { emissiveIntensity: 1.55, duration: 0.8 }, 16.15);

    // Copy overlay: fade each scene label in over its window, out near the end.
    SCENES.forEach((s, idx) => {
      const el = copyEls[idx];
      if (!el || (!s.title && !s.eyebrow)) return;
      tl.fromTo(el, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: 'power2.out' }, idx + 0.64);
      tl.to(el, { autoAlpha: 0, y: -10, duration: 0.1, ease: 'power2.in' }, idx + 0.88);
    });
    // Keep normalized timeline progress exactly aligned with the 17 scene windows.
    tl.to({ value: 0 }, { value: 1, duration: .001 }, SCENES.length - .001);
    tl.eventCallback('onUpdate', () => {
      applyVisibilityAt(tl.time());
      invalidate();
    });
  });

  applyVisibilityAt(0);
  ScrollTrigger.refresh();
  invalidate();

  return {
    seek: (p: number) => {
      const progress = THREE.MathUtils.clamp(p, 0, 1);
      master?.progress(progress);
      applyVisibilityAt(master?.time() ?? progress * SCENES.length);
      invalidate();
    },
    dispose: () => ctx.revert(),
  };
}
