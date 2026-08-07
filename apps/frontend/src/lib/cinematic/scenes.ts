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
export interface CameraWaypoint extends CameraKey {
  /** Arrival time inside the scene's normalized [0,1] window. Keep the last point before captions. */
  at: number;
}
export interface SceneDef {
  id: number;
  key: string;
  /** Short overlay copy faded in over this scene (empty = no overlay). */
  eyebrow?: string;
  title?: string;
  /** Camera keyframe reached at the END of this scene's window. */
  camera: CameraKey;
  /** Piecewise collision-free walking route used instead of one straight camera segment. */
  route?: CameraWaypoint[];
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
    key: 'foyer',
    eyebrow: 'Welcome home',
    title: 'The double-height foyer',
    camera: { pos: { x: -.6, y: 2, z: 4.55 }, target: { x: 0, y: 1.4, z: 2.65 } },
    route: [
      { at:.18,pos:{x:-.55,y:2,z:5.4},target:{x:-.55,y:1.55,z:3.2} },
      { at:.36,pos:{x:-.55,y:2,z:4.9},target:{x:-.25,y:1.45,z:2.8} },
      { at:.56,pos:{x:-.6,y:2,z:4.55},target:{x:0,y:1.4,z:2.65} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 7,
    key: 'living',
    eyebrow: 'Interior Design',
    title: 'The living room',
    camera: { pos: { x: -1.5, y: 2, z: .6 }, target: { x: -4.05, y: 1.1, z: .65 } },
    route: [
      { at:.16,pos:{x:-.95,y:2,z:2.8},target:{x:-1.7,y:1.6,z:2.8} },
      { at:.28,pos:{x:-1.5,y:2,z:2.8},target:{x:-1.5,y:1.4,z:1.2} },
      { at:.44,pos:{x:-1.5,y:2,z:.9},target:{x:-3.6,y:1.15,z:.7} },
      { at:.56,pos:{x:-1.5,y:2,z:.6},target:{x:-4.05,y:1.1,z:.65} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 8,
    key: 'dining',
    eyebrow: 'Entertaining',
    title: 'The dining room',
    camera: { pos: { x: 1.9, y: 2, z: 4.05 }, target: { x: 3.5, y: 1.1, z: 2.58 } },
    route: [
      { at:.15,pos:{x:-1.5,y:2,z:2.8},target:{x:-.4,y:1.7,z:2.8} },
      { at:.27,pos:{x:-.55,y:2,z:2.8},target:{x:1.4,y:1.6,z:2.65} },
      { at:.4,pos:{x:1.35,y:2,z:2.65},target:{x:2.2,y:1.35,z:2.6} },
      { at:.48,pos:{x:1.9,y:2,z:2.65},target:{x:3.5,y:1.1,z:2.6} },
      { at:.56,pos:{x:1.9,y:2,z:4.05},target:{x:3.5,y:1.1,z:2.58} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 9,
    key: 'kitchen',
    eyebrow: 'Modular Kitchen',
    title: 'The kitchen',
    camera: { pos: { x: 5.85, y: 2, z: .55 }, target: { x: 3.55, y: 1.25, z: -1.35 } },
    route: [
      { at:.14,pos:{x:1.95,y:2,z:4.05},target:{x:4.9,y:1.7,z:3.9} },
      { at:.27,pos:{x:4.9,y:2,z:4.05},target:{x:4.9,y:1.6,z:1.5} },
      { at:.39,pos:{x:4.9,y:2,z:1.65},target:{x:4.9,y:1.5,z:.5} },
      { at:.47,pos:{x:4.9,y:2,z:1.15},target:{x:4.2,y:1.3,z:-.8} },
      { at:.56,pos:{x:5.85,y:2,z:.55},target:{x:3.55,y:1.25,z:-1.35} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 10,
    key: 'powder',
    eyebrow: 'Guest convenience',
    title: 'The powder room',
    camera: { pos: { x: .55, y: 2, z: -.75 }, target: { x: .45, y: 1.3, z: -2.55 } },
    route: [
      { at:.12,pos:{x:5.25,y:2,z:.35},target:{x:1.85,y:1.7,z:.35} },
      { at:.24,pos:{x:1.85,y:2,z:.35},target:{x:1.85,y:1.55,z:-1.7} },
      { at:.34,pos:{x:1.85,y:2,z:-1.7},target:{x:1.85,y:1.45,z:-.85} },
      { at:.4,pos:{x:1.3,y:2,z:-1.7},target:{x:.55,y:1.45,z:-1.7} },
      { at:.47,pos:{x:.55,y:2,z:-1.7},target:{x:.55,y:1.35,z:-.75} },
      { at:.52,pos:{x:.55,y:2,z:-.75},target:{x:.55,y:1.35,z:-2.45} },
      { at:.56,pos:{x:.55,y:2,z:-.75},target:{x:.45,y:1.3,z:-2.55} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 11,
    key: 'stairs',
    eyebrow: 'Connected living',
    title: 'The floating staircase',
    camera: { pos: { x: -.85, y: 2, z: -3.55 }, target: { x: -.85, y: 2.5, z: -1.1 } },
    route: [
      { at:.1,pos:{x:1.35,y:2,z:.65},target:{x:1.45,y:1.7,z:1.15} },
      { at:.18,pos:{x:1.45,y:2,z:1.15},target:{x:-1.95,y:1.7,z:1.15} },
      { at:.29,pos:{x:-1.95,y:2,z:1.15},target:{x:-1.95,y:1.7,z:-1.35} },
      { at:.38,pos:{x:-1.95,y:2,z:-1.35},target:{x:-1.95,y:1.5,z:-3.5} },
      { at:.46,pos:{x:-1.95,y:2,z:-3.5},target:{x:-.85,y:1.5,z:-3.35} },
      { at:.52,pos:{x:-.85,y:2,z:-3.5},target:{x:-.85,y:2.4,z:-1.1} },
      { at:.56,pos:{x:-.85,y:2,z:-3.55},target:{x:-.85,y:2.5,z:-1.1} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 12,
    key: 'landing',
    eyebrow: 'Upper floor',
    title: 'The private landing',
    camera: { pos: { x: .68, y: 5.1, z: 1.65 }, target: { x: .12, y: 4.35, z: -.75 } },
    route: [
      { at:.1,pos:{x:-.85,y:2.09,z:-3},target:{x:-.85,y:2.85,z:-2.04} },
      { at:.21,pos:{x:-.85,y:2.85,z:-2.04},target:{x:-.85,y:3.61,z:-1.08} },
      { at:.32,pos:{x:-.85,y:3.61,z:-1.08},target:{x:-.85,y:4.37,z:-.12} },
      { at:.43,pos:{x:-.85,y:4.37,z:-.12},target:{x:-.85,y:4.94,z:.6} },
      { at:.49,pos:{x:-.85,y:4.94,z:.6},target:{x:.68,y:4.8,z:.85} },
      { at:.52,pos:{x:.68,y:5.1,z:.85},target:{x:.68,y:4.5,z:1.65} },
      { at:.56,pos:{x:.68,y:5.1,z:1.65},target:{x:.12,y:4.35,z:-.75} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 13,
    key: 'master',
    eyebrow: 'Private retreat',
    title: 'The master bedroom',
    camera: { pos: { x: -.7, y: 5.1, z: 3.9 }, target: { x: -3.8, y: 4.15, z: .72 } },
    route: [
      { at:.18,pos:{x:.68,y:5.1,z:2.65},target:{x:-1.8,y:4.7,z:2.65} },
      { at:.34,pos:{x:-1.9,y:5.1,z:2.65},target:{x:-3.8,y:4.2,z:.8} },
      { at:.46,pos:{x:-1.9,y:5.1,z:3.4},target:{x:-3.8,y:4.2,z:.75} },
      { at:.56,pos:{x:-.7,y:5.1,z:3.9},target:{x:-3.8,y:4.15,z:.72} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 14,
    key: 'second-bedroom',
    eyebrow: 'Room to grow',
    title: 'The second bedroom',
    camera: { pos: { x: 4.2, y: 5.1, z: 4.55 }, target: { x: 3.45, y: 4.15, z: 2.2 } },
    route: [
      { at:.18,pos:{x:.55,y:5.1,z:4.25},target:{x:2,y:4.7,z:4.25} },
      { at:.34,pos:{x:3.4,y:5.1,z:4.55},target:{x:3.45,y:4.3,z:2.25} },
      { at:.46,pos:{x:4.05,y:5.1,z:4.55},target:{x:3.45,y:4.2,z:2.2} },
      { at:.56,pos:{x:4.2,y:5.1,z:4.55},target:{x:3.45,y:4.15,z:2.2} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 15,
    key: 'master-bath',
    eyebrow: 'Premium finishes',
    title: 'The marble bathroom',
    camera: { pos: { x: 5.85, y: 5.1, z: .2 }, target: { x: 3.82, y: 4.2, z: -1.58 } },
    route: [
      { at:.12,pos:{x:3.55,y:5.1,z:4.35},target:{x:5.9,y:4.8,z:4.35} },
      { at:.26,pos:{x:5.9,y:5.1,z:4.35},target:{x:5.9,y:4.7,z:1.2} },
      { at:.42,pos:{x:5.9,y:5.1,z:.35},target:{x:4.4,y:4.5,z:-1.2} },
      { at:.56,pos:{x:5.85,y:5.1,z:.2},target:{x:3.82,y:4.2,z:-1.58} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 16,
    key: 'terrace',
    eyebrow: 'Upper-level living',
    title: 'The terrace & skyline',
    camera: { pos: { x: 4.7, y: 5.3, z: 4.6 }, target: { x: 2, y: 4.4, z: 5.3 } },
    route: [
      { at:.16,pos:{x:5.9,y:5.1,z:2.8},target:{x:5.9,y:4.7,z:4.2} },
      { at:.32,pos:{x:5.9,y:5.1,z:4.35},target:{x:4.7,y:4.6,z:4.45} },
      { at:.44,pos:{x:4.75,y:5.15,z:4.6},target:{x:3.2,y:4.5,z:5.1} },
      { at:.56,pos:{x:4.7,y:5.3,z:4.6},target:{x:2,y:4.4,z:5.3} },
    ],
    ease: 'power2.inOut',
  },
  {
    id: 17,
    key: 'reveal',
    eyebrow: 'Ansari Space Craft',
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
