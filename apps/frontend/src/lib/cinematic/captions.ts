/**
 * Reference-style caption cards for the cinematic walkthrough (owner-approved "We Build Dreams"
 * design language): a big gold two-digit number, a bold TWO-LINE display headline and 2–3 short
 * support lines, keyed by scene id. Rendered by the copy overlay in cinematic-experience.tsx and
 * scrubbed by the director exactly like the previous captions (autoAlpha/y tweens on
 * [data-scene-copy] elements — the markup inside is free-form).
 */

export interface SceneCaption {
  /** Two display-headline lines (reference style: line 1 white, line 2 white — number is gold). */
  lines: [string, string];
  /** 2–3 short support lines rendered as one small paragraph. */
  body: string;
}

/** Keyed by SceneDef.id (1-based, matches lib/cinematic/scenes.ts). */
export const SCENE_CAPTIONS: Record<number, SceneCaption> = {
  1: {
    lines: ['Empty Land,', 'Endless Possibility'],
    body: 'Every home begins as open ground. We read the site, the light and the levels — and see the finished villa before the first peg goes in.',
  },
  2: {
    lines: ['Strong Foundation,', 'Stronger Tomorrow'],
    body: 'Set out, reinforced and poured to specification — the quiet engineering a lasting home stands on.',
  },
  3: {
    lines: ['Building Strength,', 'Building Trust'],
    body: 'An RCC frame raised true and plumb — proven materials, modern technique and engineering you can measure.',
  },
  4: {
    lines: ['Crafted Perfection', 'Outside & In'],
    body: 'Elevations composed in warm stone, timber and glass — a facade that holds its lines from every approach.',
  },
  5: {
    lines: ['Arrive Home,', 'Every Single Day'],
    body: 'The gate draws back and the drive opens. A considered arrival sets the tone before you reach the door.',
  },
  6: {
    lines: ['Luxury in Every', 'Little Detail'],
    body: 'Interiors tailored to the way you live — warm materials, precise joinery and light exactly where it belongs.',
  },
  7: {
    lines: ['Modern Kitchens', 'Made for You'],
    body: 'An island to gather around, storage that disappears and finishes chosen to outlast trends.',
  },
  8: {
    lines: ['Comfort Meets', 'Elegance'],
    body: 'A ground-floor guest suite with its own washroom — private, calm and ready for the people you host.',
  },
  9: {
    lines: ['Your Private', 'Retreat Upstairs'],
    body: 'The master bedroom closes the day in quiet luxury — soft light, layered texture and room to breathe.',
  },
  10: {
    lines: ['Refined Down', 'To the Marble'],
    body: 'Stone, frameless glass and warm light — an attached washroom finished to suite standard.',
  },
  11: {
    lines: ['Room to Grow,', 'Room to Rest'],
    body: 'A second bedroom that adapts over the years — family, guests and everything in between.',
  },
  12: {
    lines: ['Evenings Above', 'The Skyline'],
    body: 'An open terrace made for slow evenings — planted, lit and framed by the skyline.',
  },
  13: {
    lines: ['We Build the Moment', 'You Walk In'],
    body: 'From the first drawing to the final key, Ansari Space Craft delivers your home end to end.',
  },
};
