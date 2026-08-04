# Cinematic Storyboard

The public experience is a single scroll-driven narrative: from empty land to a finished luxury
villa, then into services, projects, testimonials, and contact. Scroll **is** the timeline.

## The Scene Director

- **One pinned R3F `<Canvas>`** hosts Scenes 1–11 (the WebGL story). It's pinned via a tall
  scroll-spacer; scroll progress `0 → 1` scrubs a **single GSAP timeline**.
- **Lenis** is the only scroll authority; its RAF drives `ScrollTrigger.update()` so smooth scroll
  and animation stay frame-locked. No native scroll listeners compete.
- The timeline mutates **refs** (camera position/target, per-object visibility, material params,
  mesh transforms). React never re-renders on scroll — GSAP writes directly to Three objects for
  60fps.
- Scenes 12–15 are premium **DOM sections** below the canvas: Framer Motion + ScrollTrigger reveals.
- **`prefers-reduced-motion`** → the canvas renders a single hero still and each section becomes a
  static, fully-readable block. No information lives only in motion.

```
scroll 0 ─────────────────────────────────────────────────────────── 1
│ S1  │ S2 │ S3 │ S4  │ S5 │ S6 │ S7 │ S8 │ S9 │ S10 │ S11 │  ← pinned WebGL (scrubbed)
land   found. walls villa gate living kitch bed  bath terr  reveal
                                                                └────▶ unpin
[ S12 Services ][ S13 Projects ][ S14 Testimonials ][ S15 Contact ]   ← DOM sections
```

Each scene owns a normalized progress window; the director interpolates camera keyframes and toggles
scene state at window boundaries with eased transitions (no hard cuts).

---

## Scene-by-Scene

### Scene 1 — Empty Land (Dawn)
- **Beat:** nothing exists. Fogged ground plane, morning light, drifting birds, wind-swayed grass.
- **Tech:** low-poly terrain, exponential fog, gradient sky, instanced grass with vertex-shader
  wind, sprite/instanced birds on a looping path, subtle camera dolly-in. Ambient wind audio (muted
  until user gesture).
- **Scroll:** camera glides forward over the empty plot; title/wordmark fades in then out.

### Scene 2 — Foundation
- **Beat:** construction begins — trench, poured concrete slab, rebar grid rising.
- **Tech:** slab scales up on a clip-plane "pour" reveal; instanced steel bars grow along Y with
  staggered timeline offsets; dust particle burst. Material roughness animates wet→cured.

### Scene 3 — Structure Rises
- **Beat:** four walls rise from the ground, columns extrude, roof lands.
- **Tech:** wall meshes animate `scale.y 0→1` from a grounded pivot with elastic-out easing;
  columns stagger; roof drops in with a settle bounce + impact dust. Shadows update as mass appears.

### Scene 4 — Transformation to Luxury Villa
- **Beat:** raw shell morphs into a finished villa — cladding, glass, warm materials.
- **Tech:** cross-fade/morph between "shell" and "villa" material sets; ACP/glass panels fade in;
  emissive window glow ramps; environment map swaps to golden-hour HDRI. Signature hero moment.

### Scene 5 — Approach & Gate
- **Beat:** camera moves toward the gate; it opens automatically.
- **Tech:** camera path eases to the entrance; gate halves rotate on hinges (timeline-driven);
  landscape/pathway lights ignite in sequence.

### Scene 6 — Living Room
- **Beat:** camera glides inside — the reveal of interior craftsmanship.
- **Tech:** interior set streamed in / made visible on entry; soft area lighting, furniture,
  parallax depth. Copy overlay: "Interior Design".

### Scene 7 — Kitchen
- **Beat:** modular kitchen showcase.
- **Tech:** camera pan across cabinetry; subtle material highlights (counter, metal, glass);
  micro-animated accents. Copy: "Modular Kitchen".

### Scene 8 — Bedroom
- **Beat:** warmth and calm; textiles, ambient light.
- **Tech:** slow dolly, depth-of-field feel via layered fog/bokeh sprite, warm key light.

### Scene 9 — Bathroom
- **Beat:** premium finishes — tile, glass, chrome.
- **Tech:** reflective/roughness-tuned materials, glass work highlight, gentle specular sweep.

### Scene 10 — Terrace
- **Beat:** camera rises to the terrace; skyline, railings, open sky.
- **Tech:** camera cranes up and out; railing detail (steel fabrication); sky/time-of-day shift to
  evening; city bokeh.

### Scene 11 — Complete Villa Reveal
- **Beat:** pull back to the finished, lit villa at dusk — the payoff shot.
- **Tech:** wide orbit/pull-back, full emissive glow, volumetric-lite god rays, brand line resolves.
  Canvas **unpins** here, handing off to DOM sections.

### Scene 12 — Services
- **Beat:** the 12 offerings, presented as premium glassmorphic cards.
- **Tech:** DOM grid; ScrollTrigger staggered reveal; magnetic hover, tilt, gold accent lines.
  Data from `GET /services`.

### Scene 13 — Projects
- **Beat:** portfolio showcase.
- **Tech:** horizontal-scroll / masonry gallery pinned via ScrollTrigger; image reveal masks;
  filter by category. Data from `GET /projects`.

### Scene 14 — Testimonials
- **Beat:** social proof.
- **Tech:** auto/scroll-advancing quote carousel, character-split text reveal (SplitText-style),
  avatar parallax. Data from `GET /testimonials?featured=true`.

### Scene 15 — Contact
- **Beat:** invitation to begin — contact + quotation CTA.
- **Tech:** Framer Motion form (React Hook Form + Zod), inline validation, success micro-animation.
  `POST /contact` / `POST /quotations`.

---

## Reusable Animation Primitives (built in Phase 6)

To honor DRY, scenes compose from shared hooks/components — not bespoke code each time:

- `useLenis()` — smooth-scroll singleton + ScrollTrigger bridge.
- `useSceneProgress(range)` — normalized 0–1 progress for a scene window.
- `useReducedMotion()` — gates the whole motion system.
- `<ScrollScene>` — declares a scene's scroll window + timeline.
- `<RevealText>` / `<RevealGroup>` — staggered text/element reveals.
- `<MagneticCard>` / `<TiltCard>` — DOM micro-interactions for Scenes 12–15.
- `three/` primitives: `<InstancedGrass>`, `<Birds>`, `<GrowMesh>`, `<Gate>`, `<CameraRig>`.

---

## Performance Budget

| Constraint | Target |
|---|---|
| Frame rate | 60fps desktop / ≥30fps mid mobile |
| Draw calls (peak scene) | < 150 (instancing for grass/bars/birds) |
| WebGL bundle (gz) | < 800 KB (dynamic-imported, below hero) |
| GLB models | Draco/meshopt compressed, KTX2 textures, LOD where useful |
| DPR | capped at `min(devicePixelRatio, 2)` |
| Frameloop | `demand` where static; `always` only during active scrub |
| Initial route | LCP < 2.5s; hero paints without waiting on WebGL |
| Fallback | full static experience under `prefers-reduced-motion` / no-WebGL |

**Open decision (Phase 6 gate):** source of the 3D models — commissioned/licensed GLBs vs.
procedural geometry vs. AI-generated. Determines final art direction and bundle size.
