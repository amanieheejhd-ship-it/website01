/**
 * Scene direction data for the pinned cinematic canvas (docs/CINEMATIC-STORYBOARD.md).
 *
 * The whole journey is ONE continuous procedural world: an empty plot that constructs itself and
 * shifts from dawn → golden hour → evening as a scrubbed camera flies through it. Each scene owns a
 * normalized window on the master GSAP timeline; the director interpolates the camera between the
 * per-scene keyframes below and toggles per-scene object state at the window boundaries.
 *
 * THE TOUR (the owner's flow): exterior build-up → the MAIN DOOR OPENS and the camera steps straight
 * into the LIVING HALL (no foyer room exists) → the kitchen & dining zone → the staircase up → the
 * master bedroom → THROUGH the bedroom's internal door into the attached washroom → the second
 * bedroom → the terrace → the final exterior reveal. The ground floor has NO bathroom.
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
    camera: { pos: { x: 0, y: 2.1, z: 9.5 }, target: { x: -0.55, y: 1.6, z: 4.4 } },
    ease: 'power2.inOut',
  },
  {
    id: 6,
    key: 'hall',
    eyebrow: 'Welcome home',
    title: 'The living hall',
    camera: { pos: { x: -0.5, y: 1.6, z: 3.3 }, target: { x: -3.15, y: 1.1, z: .3 } },
    route: [
      // The main door swings open and the tour steps STRAIGHT into the hall — sofas first. The
      // settled shot is EYE-LEVEL (~1.6) and clears the sofa backs: full seating + TV wall + rug.
      { at:.12,pos:{x:-.55,y:2,z:6.4},target:{x:-.55,y:1.5,z:4.4} },
      { at:.28,pos:{x:-.55,y:1.9,z:4.62},target:{x:-.7,y:1.35,z:2.6} },
      { at:.4,pos:{x:-.15,y:1.75,z:3.6},target:{x:-2.9,y:1.2,z:.85} },
      { at:.48,pos:{x:-.35,y:1.66,z:3.42},target:{x:-3.05,y:1.14,z:.5} },
      { at:.56,pos:{x:-.5,y:1.6,z:3.3},target:{x:-3.15,y:1.1,z:.3} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 7,
    key: 'kitchen-dining',
    eyebrow: 'The heart of the home',
    title: 'The kitchen & dining',
    camera: { pos: { x: 4.88, y: 2, z: 1.5 }, target: { x: 3.35, y: 1.25, z: -.95 } },
    route: [
      // Hall → the dining doorway → along the table → through the shared doorway into the kitchen.
      { at:.12,pos:{x:-1.0,y:2,z:2.7},target:{x:1.5,y:1.5,z:2.65} },
      { at:.24,pos:{x:1.15,y:2,z:2.6},target:{x:3.5,y:1.3,z:2.6} },
      { at:.38,pos:{x:2.6,y:2,z:2.9},target:{x:3.5,y:1.25,z:2.6} },
      { at:.5,pos:{x:4.4,y:2,z:2.2},target:{x:4.9,y:1.5,z:1.0} },
      { at:.56,pos:{x:4.88,y:2,z:1.5},target:{x:3.35,y:1.25,z:-.95} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 8,
    key: 'staircase',

    eyebrow: 'Ground-floor comfort',
    title: 'The guest suite',

    camera: {
      pos: {
        x: -1.10,
        y: 1.82,
        z: 0.50
      },
      target: {
        x: -0.57,
        y: 1.42,
        z: 4.00
      }
    },

    route: [

      // --------------------------------------------------------
      // 1. LEAVE KITCHEN
      // --------------------------------------------------------

      {
        at: .05,
        pos: {
          x: 3.90,
          y: 1.95,
          z: .30
        },
        target: {
          x: 1.40,
          y: 1.40,
          z: .10
        }
      },


      // --------------------------------------------------------
      // 2. CROSS DINING / OPEN PLAN
      // No second living-room tour.
      // --------------------------------------------------------

      {
        at: .11,
        pos: {
          x: .60,
          y: 1.90,
          z: .70
        },
        target: {
          x: -1.60,
          y: 1.40,
          z: -.60
        }
      },


      // --------------------------------------------------------
      // 3. CLOSED BEDROOM DOOR HERO
      // Door MUST still be closed here.
      // --------------------------------------------------------

      {
        at: .15,
        pos: {
          x: -1.70,
          y: 1.83,
          z: .15
        },
        target: {
          x: -2.15,
          y: 1.35,
          z: -1.25
        }
      },


      // --------------------------------------------------------
      // 4. DOOR OPENS / APPROACH
      // --------------------------------------------------------

      {
        at: .22,
        pos: {
          x: -2.00,
          y: 1.80,
          z: -.50
        },
        target: {
          x: -2.30,
          y: 1.32,
          z: -2.00
        }
      },


      // --------------------------------------------------------
      // 5. PHYSICALLY ENTER BEDROOM
      // --------------------------------------------------------

      {
        at: .28,
        pos: {
          x: -2.10,
          y: 1.77,
          z: -1.50
        },
        target: {
          x: -2.40,
          y: 1.28,
          z: -3.20
        }
      },


      // --------------------------------------------------------
      // 6. BED + FEATURE WALL HERO
      // --------------------------------------------------------

      {
        at: .34,
        pos: {
          x: -1.55,
          y: 1.75,
          z: -2.25
        },
        target: {
          x: -2.55,
          y: 1.30,
          z: -3.75
        }
      },


      // --------------------------------------------------------
      // 7. WARDROBE / EAST SIDE
      // --------------------------------------------------------

      {
        at: .40,
        pos: {
          x: -1.35,
          y: 1.75,
          z: -2.55
        },
        target: {
          x: -.75,
          y: 1.42,
          z: -3.00
        }
      },


      // --------------------------------------------------------
      // 8. FULL ROOM / DRESSING SIDE
      // --------------------------------------------------------

      {
        at: .45,
        pos: {
          x: -2.15,
          y: 1.78,
          z: -2.35
        },
        target: {
          x: -3.90,
          y: 1.35,
          z: -2.60
        }
      },


      // --------------------------------------------------------
      // 9. APPROACH ATTACHED WASHROOM
      // --------------------------------------------------------

      {
        at: .50,
        pos: {
          x: -3.45,
          y: 1.72,
          z: -1.72
        },
        target: {
          x: -4.15,
          y: 1.30,
          z: -2.60
        }
      },


      // --------------------------------------------------------
      // 10. WASHROOM DOOR OPENS
      // --------------------------------------------------------

      {
        at: .55,
        pos: {
          x: -4.13,
          y: 1.70,
          z: -1.90
        },
        target: {
          x: -4.75,
          y: 1.30,
          z: -3.05
        }
      },


      // --------------------------------------------------------
      // 11. ENTER ENSUITE ? VANITY / MIRROR
      // --------------------------------------------------------

      {
        at: .59,
        pos: {
          x: -3.92,
          y: 1.60,
          z: -2.46
        },
        target: {
          x: -5.15,
          y: 1.22,
          z: -3.05
        }
      },


      // --------------------------------------------------------
      // 12. SHOWER / TOILET
      // --------------------------------------------------------

      {
        at: .63,
        pos: {
          x: -4.15,
          y: 1.60,
          z: -2.62
        },
        target: {
          x: -4.72,
          y: 1.10,
          z: -3.68
        }
      },


      // --------------------------------------------------------
      // 13. RETURN FROM ENSUITE
      // --------------------------------------------------------

      {
        at: .68,
        pos: {
          x: -4.05,
          y: 1.70,
          z: -2.32
        },
        target: {
          x: -2.80,
          y: 1.38,
          z: -1.80
        }
      },


      // --------------------------------------------------------
      // 14. BED HERO HOLD (the caption shot: bed + bedding is the
      // clear subject, wardrobe to the side — NOT a wall/door).
      // --------------------------------------------------------

      {
        at: .74,
        pos: {
          x: -1.85,
          y: 1.38,
          z: -1.38
        },
        target: {
          x: -2.50,
          y: 1.12,
          z: -3.85
        }
      },


      // --------------------------------------------------------
      // 15. HOLD — bed-hero angle (same family as waypoint 6, well
      // clear of the open door leaf): bed + bedding + headboard.
      // --------------------------------------------------------

      {
        at: .84,
        pos: {
          x: -1.90,
          y: 1.40,
          z: -1.42
        },
        target: {
          x: -2.48,
          y: 1.14,
          z: -3.80
        }
      },


      // --------------------------------------------------------
      // 16. QUICK HANDOFF SWING TOWARD MAIN ENTRANCE
      // --------------------------------------------------------

      {
        at: .93,
        pos: {
          x: -1.10,
          y: 1.82,
          z: .50
        },
        target: {
          x: -.57,
          y: 1.42,
          z: 4.00
        }
      }

    ],

    ease: 'power1.inOut',
  },
  {
    id: 9,
    key: 'master',

    eyebrow: 'Private retreat',
    title: 'The master bedroom',

    camera: {
      pos: {
        x: -.90,
        y: 5.08,
        z: 3.75
      },
      target: {
        x: -3.80,
        y: 4.15,
        z: .72
      }
    },

    route: [

      // --------------------------------------------------------
      // 1. CONTINUE FROM GROUND BEDROOM EXIT
      // --------------------------------------------------------

      {
        at: .04,
        pos: {
          x: -1.05,
          y: 1.82,
          z: .65
        },
        target: {
          x: -.57,
          y: 1.42,
          z: 4.00
        }
      },


      // --------------------------------------------------------
      // 2. WALK TO MAIN ENTRANCE
      // --------------------------------------------------------

      {
        at: .10,
        pos: {
          x: -.64,
          y: 1.84,
          z: 2.75
        },
        target: {
          x: -.57,
          y: 1.42,
          z: 4.70
        }
      },


      // --------------------------------------------------------
      // 3. PASS THROUGH MAIN DOOR
      // --------------------------------------------------------

      {
        at: .16,
        pos: {
          x: -.57,
          y: 1.84,
          z: 4.30
        },
        target: {
          x: -.45,
          y: 1.40,
          z: 5.65
        }
      },


      // --------------------------------------------------------
      // 4. OUTSIDE FRONT
      // --------------------------------------------------------

      {
        at: .23,
        pos: {
          x: -.35,
          y: 1.88,
          z: 5.75
        },
        target: {
          x: 4.75,
          y: 1.42,
          z: 5.00
        }
      },


      // --------------------------------------------------------
      // 5. WALK ALONG EXTERIOR TOWARD STAIRS
      // --------------------------------------------------------

      {
        at: .30,
        pos: {
          x: 4.80,
          y: 1.88,
          z: 5.05
        },
        target: {
          x: 6.55,
          y: 1.35,
          z: 2.20
        }
      },


      // --------------------------------------------------------
      // 6. TURN TOWARD STAIR BOTTOM
      // --------------------------------------------------------

      {
        at: .36,
        pos: {
          x: 6.85,
          y: 1.78,
          z: 1.40
        },
        target: {
          x: 6.56,
          y: 1.10,
          z: -3.58
        }
      },


      // --------------------------------------------------------
      // 7. BOTTOM OF EXTERIOR STAIRCASE
      // --------------------------------------------------------

      {
        at: .42,
        pos: {
          x: 7.18,
          y: 1.55,
          z: -3.70
        },
        target: {
          x: 6.56,
          y: 1.18,
          z: -2.40
        }
      },


      // --------------------------------------------------------
      // 8. LOWER FLIGHT
      // --------------------------------------------------------

      {
        at: .48,
        pos: {
          x: 7.08,
          y: 2.05,
          z: -2.10
        },
        target: {
          x: 6.56,
          y: 2.05,
          z: -.30
        }
      },


      // --------------------------------------------------------
      // 9. MID FLIGHT
      // --------------------------------------------------------

      {
        at: .54,
        pos: {
          x: 7.04,
          y: 2.72,
          z: .15
        },
        target: {
          x: 6.56,
          y: 2.75,
          z: 1.80
        }
      },


      // --------------------------------------------------------
      // 10. UPPER FLIGHT
      // --------------------------------------------------------

      {
        at: .60,
        pos: {
          x: 7.00,
          y: 3.42,
          z: 2.25
        },
        target: {
          x: 6.56,
          y: 3.55,
          z: 3.70
        }
      },


      // --------------------------------------------------------
      // 11. FIRST-FLOOR LANDING
      // --------------------------------------------------------

      {
        at: .65,
        pos: {
          x: 6.56,
          y: 4.82,
          z: 3.80
        },
        target: {
          x: 5.20,
          y: 4.50,
          z: 3.80
        }
      },


      // --------------------------------------------------------
      // 12. ENTER FIRST FLOOR
      // --------------------------------------------------------

      {
        at: .69,
        pos: {
          x: 5.10,
          y: 4.92,
          z: 3.80
        },
        target: {
          x: 2.60,
          y: 4.55,
          z: 3.55
        }
      },


      // --------------------------------------------------------
      // 13. MASTER BEDROOM HANDOFF
      // --------------------------------------------------------

      {
        at: .73,
        pos: {
          x: -.90,
          y: 5.08,
          z: 3.75
        },
        target: {
          x: -3.80,
          y: 4.15,
          z: .72
        }
      }

    ],

    ease: 'power1.inOut',
  },
  {
    id: 10,
    key: 'washroom',
    eyebrow: 'Attached to the master',
    title: 'The attached washroom',
    camera: { pos: { x: -3.55, y: 4.82, z: -2.55 }, target: { x: -4.7, y: 4.42, z: -3.62 } },
    route: [
      // Walk INSIDE the bedroom to its internal door, and step THROUGH it into the ensuite. The
      // settled shot stands in the room centre: vanity + seated basins + mirror, shower to the side.
      { at:.14,pos:{x:-3.2,y:5.05,z:2.2},target:{x:-5.05,y:4.4,z:-1.5} },
      { at:.3,pos:{x:-4.55,y:5.0,z:.7},target:{x:-5.1,y:4.4,z:-1.9} },
      { at:.44,pos:{x:-5.06,y:4.98,z:-1.15},target:{x:-5.1,y:4.35,z:-2.6} },
      { at:.52,pos:{x:-4.4,y:4.9,z:-2.05},target:{x:-4.65,y:4.45,z:-3.55} },
      { at:.56,pos:{x:-3.55,y:4.82,z:-2.55},target:{x:-4.7,y:4.42,z:-3.62} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 11,
    key: 'second-bedroom',
    eyebrow: 'Room to grow',
    title: 'The second bedroom',
    camera: { pos: { x: 2.6, y: 4.95, z: 3.3 }, target: { x: 3.9, y: 4.15, z: 1.55 } },
    route: [
      // Back out through the ensuite door, across the landing INTO the second bedroom. The settled
      // shot stands INSIDE the room (the old one stood outside on the balcony, shooting the window
      // frame + a parapet orb): bed + desk + wardrobe on one clean diagonal.
      { at:.1,pos:{x:-5.08,y:4.98,z:-1.35},target:{x:-3.6,y:4.5,z:.8} },
      { at:.2,pos:{x:-4.0,y:5.05,z:.6},target:{x:-1.5,y:4.5,z:2.4} },
      { at:.32,pos:{x:-1.6,y:5.1,z:2.7},target:{x:.6,y:4.6,z:3.6} },
      { at:.42,pos:{x:.55,y:5.1,z:4.25},target:{x:2,y:4.7,z:4.25} },
      { at:.52,pos:{x:2.9,y:5.0,z:3.5},target:{x:3.7,y:4.25,z:1.9} },
      { at:.56,pos:{x:2.6,y:4.95,z:3.3},target:{x:3.9,y:4.15,z:1.55} },
    ],
    ease: 'power1.inOut',
  },
  {
    id: 12,
    key: 'terrace',
    eyebrow: 'Upper-level living',
    title: 'The terrace & skyline',
    camera: { pos: { x: 4.7, y: 5.3, z: 4.6 }, target: { x: 2, y: 4.4, z: 5.3 } },
    route: [
      { at:.16,pos:{x:5.05,y:5.15,z:4.45},target:{x:5.9,y:4.7,z:4.3} },
      { at:.32,pos:{x:5.9,y:5.1,z:4.35},target:{x:4.7,y:4.6,z:4.45} },
      { at:.44,pos:{x:4.75,y:5.15,z:4.6},target:{x:3.2,y:4.5,z:5.1} },
      { at:.56,pos:{x:4.7,y:5.3,z:4.6},target:{x:2,y:4.4,z:5.3} },
    ],
    ease: 'power2.inOut',
  },
  {
    id: 13,
    key: 'reveal',
    eyebrow: 'Ansari Space Craft',
    title: 'We build the moment you walk in',
    camera: { pos: { x: 9.8, y: 5.35, z: 16.5 }, target: { x: -.25, y: 2.75, z: .8 } },
    ease: 'power2.inOut',
  },
];

/** Per-scene duration on the timeline is uniform; total = SCENES.length. */
export const SCENE_COUNT = SCENES.length;

/**
 * Per-scene scroll distance (vh). Touch devices get a shorter run so the full story doesn't demand
 * exhausting thumb-scrolling; the scene order/choreography is identical (the timeline is normalized
 * to the spacer, so only the scrub distance changes).
 */
export function sceneScrollVh(coarsePointer: boolean): number {
  return coarsePointer ? 52 : 80;
}

/**
 * PORTRAIT FRAMING (aspect < ~0.75): the desktop cameras are composed for landscape; a phone held
 * upright crops the sides badly (half the villa, wall close-ups). The director compensates by
 * dollying each camera BACK along its own view axis (`back`, world units), raising it (`up`) and —
 * where the floor otherwise fills the frame — lifting the aim point (`aimUp`). Values are authored
 * per scene against the real world coordinates: generous for wide exteriors, small for interiors
 * (a big pull-back would push the camera through a wall).
 */
export interface PortraitTweak {
  back: number;
  up: number;
  aimUp?: number;
}

export const PORTRAIT_DEFAULT_TWEAK: PortraitTweak = { back: 0.6, up: 0.2 };

export const PORTRAIT_TWEAKS: Record<number, PortraitTweak> = {
  1: { back: 6.5, up: 1.6 }, // empty land — terrain + horizon, never a dark slice
  2: { back: 5.5, up: 1.4 }, // foundation — whole slab + rebar grid
  3: { back: 7.5, up: 1.6 }, // structure — full frame + columns (was a cropped wall corner)
  4: { back: 10.5, up: 2.2 }, // villa transformation — the WHOLE villa, not a centre slice
  5: { back: 3.0, up: 0.8 }, // gate — the full entrance
  // INTERIORS: keep the dolly-back TINY. The wider portrait FOV already gives headroom, and a big
  // pull-back pushes the camera through walls/sofas/window planes (the owner's "blocked frame",
  // "sofa clip", "top-down lamps" and "window close-up" defects all traced to aggressive backs).
  6: { back: 0.15, up: 0.1 }, // living hall — stay in front of the sofa line, eye-level
  7: { back: 0.2, up: 0.05 }, // kitchen — eye-level across the island, never above the pendants
  8: { back: 0.15, up: 0.05 }, // guest suite
  9: { back: 0.55, up: 0.15 }, // exterior walk + staircase (outdoor legs tolerate a little more)
  10: { back: 0.08, up: 0, aimUp: -0.15 }, // ensuite — aim slightly DOWN, away from the open-top void
  11: { back: 0.15, up: 0.05 }, // second bedroom — stay inside the window plane
  // Terrace: NO dolly-back (the camera already stands at the parapet — pulling back exits over the
  // roof slab and the slab fills the frame). Lift the aim instead so the skyline composes.
  12: { back: 0.15, up: 0.1, aimUp: 0.55 },
  13: { back: 9.0, up: 1.6 }, // final reveal — the whole villa with breathing room
};

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
  stops: [0, 2, 4, 7, 10],
} as const;

/** Gold + ink used by materials so the 3D reads as the same brand system as the DOM. */
export const BRAND = {
  gold: 0xc8a15a,
  goldLight: 0xe5c987,
  ink: 0x0a0a0a,
  surface: 0x141414,
  foreground: 0xf5f5f4,
} as const;
