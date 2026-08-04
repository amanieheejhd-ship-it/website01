/**
 * Scene direction data for the pinned cinematic canvas (docs/CINEMATIC-STORYBOARD.md, Scenes 1–11).
 *
 * The whole journey is ONE continuous procedural world: an empty plot that constructs itself and
 * shifts from dawn → golden hour → evening as a scrubbed camera flies through it. Each scene owns a
 * normalized window on the master GSAP timeline; the director interpolates the camera between the
 * per-scene keyframes below and toggles per-scene object state at the window boundaries.
 *
 * No data here is React state — it is read once when the timeline is built and then only three.js
 * objects are mutated per frame (React stays out of the scroll path).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface CameraKey {
  /** Camera position. */
  pos: Vec3;
  /** Point the camera looks at. */
  target: Vec3;
}
export interface SceneDef {
  id: number;
  key: string;
  /** Short overlay copy faded in over this scene (empty = no overlay). */
  eyebrow?: string;
  title?: string;
  /** Camera keyframe reached at the END of this scene's window. */
  camera: CameraKey;
  /** GSAP ease for the camera move into this scene. */
  ease: string;
}

/** Camera pose at journey start (t=0), before Scene 1's move. */
export const OPENING_CAMERA: CameraKey = {
  pos: { x: 0, y: 7, z: 24 },
  target: { x: 0, y: 1.2, z: 0 },
};

export const SCENES: SceneDef[] = [
  {
    id: 1,
    key: 'empty-land',
    eyebrow: 'Scene 01',
    title: 'Empty land, endless possibility',
    camera: { pos: { x: 0, y: 3.4, z: 15 }, target: { x: 0, y: 1, z: 0 } },
    ease: 'power1.inOut',
  },
  {
    id: 2,
    key: 'foundation',
    eyebrow: 'Scene 02',
    title: 'It starts with the foundation',
    camera: { pos: { x: 7, y: 4.2, z: 11 }, target: { x: 0, y: 0.3, z: 0 } },
    ease: 'power2.inOut',
  },
  {
    id: 3,
    key: 'structure',
    eyebrow: 'Scene 03',
    title: 'The structure rises',
    camera: { pos: { x: 9.5, y: 5.2, z: 10 }, target: { x: 0, y: 2, z: 0 } },
    ease: 'power2.inOut',
  },
  {
    id: 4,
    key: 'villa-transformation',
    eyebrow: 'Scene 04',
    title: 'From a raw shell to a luxury villa',
    camera: { pos: { x: 10.5, y: 4, z: 11.5 }, target: { x: 0, y: 2.2, z: 0 } },
    ease: 'power2.inOut',
  },
  {
    id: 5,
    key: 'approach-gate',
    eyebrow: 'Scene 05',
    title: 'Arrive home',
    camera: { pos: { x: 0, y: 2.1, z: 9.5 }, target: { x: 0, y: 1.7, z: 0 } },
    ease: 'power2.inOut',
  },
  {
    id: 6,
    key: 'living',
    eyebrow: 'Interior Design',
    title: 'The living room',
    camera: { pos: { x: -1.6, y: 1.9, z: 3.2 }, target: { x: -2.5, y: 1.6, z: -2.5 } },
    ease: 'power1.inOut',
  },
  {
    id: 7,
    key: 'kitchen',
    eyebrow: 'Modular Kitchen',
    title: 'The kitchen',
    camera: { pos: { x: 2.4, y: 1.85, z: 1.2 }, target: { x: 3.2, y: 1.5, z: -3 } },
    ease: 'power1.inOut',
  },
  {
    id: 8,
    key: 'bedroom',
    eyebrow: 'Interiors',
    title: 'The bedroom',
    camera: { pos: { x: -2.6, y: 1.95, z: 0.2 }, target: { x: -3.4, y: 1.6, z: -3 } },
    ease: 'power1.inOut',
  },
  {
    id: 9,
    key: 'bathroom',
    eyebrow: 'Premium finishes',
    title: 'The bathroom',
    camera: { pos: { x: 2.2, y: 1.7, z: -1 }, target: { x: 3.6, y: 1.4, z: -2.4 } },
    ease: 'power1.inOut',
  },
  {
    id: 10,
    key: 'terrace',
    eyebrow: 'Scene 10',
    title: 'The terrace & skyline',
    camera: { pos: { x: 0, y: 7, z: 7 }, target: { x: 0, y: 3.2, z: 0 } },
    ease: 'power2.inOut',
  },
  {
    id: 11,
    key: 'reveal',
    eyebrow: 'Fardeen',
    title: 'We build the moment you walk in',
    camera: { pos: { x: 0, y: 4.6, z: 21 }, target: { x: 0, y: 2.2, z: 0 } },
    ease: 'power2.inOut',
  },
];

/** Per-scene duration on the timeline is uniform; total = SCENES.length. */
export const SCENE_COUNT = SCENES.length;

/** Convert a scene id (1-based) to its timeline window [start,end] in seconds (duration units). */
export function sceneWindow(id: number): [number, number] {
  return [id - 1, id];
}

/**
 * Golden-hour-driven palette that shifts across the journey. Keyed sky/fog/light colors are
 * interpolated by the director from these stops (dawn → warm → golden → evening).
 */
export const PALETTE = {
  // hex numbers for three.Color
  skyTop: [0x1a2436, 0x24303f, 0x3a3326, 0x5a3f24, 0x2a2333],
  skyBottom: [0x2f3a42, 0x4a4636, 0xb87a3d, 0xc8853f, 0x3a2f3a],
  fog: [0x223038, 0x3a3a30, 0x8a5f38, 0x9a6a3a, 0x2a2430],
  light: [0x9fb4c9, 0xe8d6a8, 0xffd28a, 0xffb968, 0xd9a7ff],
  /** Scene index (0-based) that each palette stop is anchored to. */
  stops: [0, 2, 4, 9, 10],
} as const;

/** Gold + ink used by materials so the 3D reads as the same brand system as the DOM. */
export const BRAND = {
  gold: 0xc8a15a,
  goldLight: 0xe5c987,
  ink: 0x0a0a0a,
  surface: 0x141414,
  foreground: 0xf5f5f4,
} as const;
