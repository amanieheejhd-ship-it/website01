# Cinematic assets — sourcing & licenses

All assets here are **CC0 (public domain)** from [Poly Haven](https://polyhaven.com). The binaries are
**git-ignored** (see repo `.gitignore`) — this manifest is the source of truth. Re-download with
`scripts/../scratchpad/dl-assets.sh` or the URLs below (base `https://dl.polyhaven.org/file/ph-assets`).

## HDRIs (image-based lighting) — `hdri/`  · 1K `.hdr`
| local file | Poly Haven asset | use |
|---|---|---|
| `sunset_puresky_1k.hdr` | `belfast_sunset_puresky` | base environment (reflections + IBL) — warm golden sky |
| `dawn_1k.hdr` | `bell_park_dawn` | alt env for the empty-land / dawn scenes (drop-in) |

## PBR textures — `textures/<name>/{diff,nor,arm}.jpg` · 1K JPG (diff=sRGB, nor=GL normal, arm=AO/Rough/Metal)
| folder | Poly Haven asset | mapped to |
|---|---|---|
| `concrete` | `concrete` | villa exterior shell (walls / columns / upper / roof) |
| `wood` | `dark_wooden_planks` | warm cladding facade |
| `marble` | `marble_01` | interior floor |
| `grass` | `leafy_grass` | terrain / lawn |

## Models — `models/` (glTF + .bin + textures) — **loader seam**
Drop real/purchased GLBs here and load them via `lib/cinematic/assets.ts::loadModel()` (GLTFLoader +
DRACO + KTX2 + meshopt). On any load failure the scene keeps its procedural geometry.

### Real CC0 models sourced (Poly Haven, glTF 1K) — loaded in `enrichWorld()`
| folder | Poly Haven asset | license | placed |
|---|---|---|---|
| `sofa/` | `Sofa_01` | CC0 | interior seating |
| `coffee_table/` | `CoffeeTable_01` | CC0 | interior |
| `armchair/` | `ArmChair_01` | CC0 | interior |
| `rocks/` | `coast_rocks_01` | CC0 | available through the loader seam; not placed in the clean estate landscape |
| `plant/` | `calathea_orbifolia_01` | CC0 | available through the loader seam; not placed in the clean estate landscape |

## Procedural, dependency-free landscape details

The lawn blades, clustered alpha-cutout tree impostors, pool ripple normal map, paving variation, and
distant-villa LOD shells are generated at runtime in `lib/cinematic/world.ts`. They add no binary asset
weight and preserve the LOW quality tier. Tree impostors are instanced cross-planes with an asymmetric
painted canopy mask rather than sphere geometry; pool normals are a small generated `DataTexture`.

## Two-floor interior

The foyer, living, dining, kitchen, powder room, staircase, landing, master suite, master bathroom,
and second bedroom are lean procedural Three.js geometry, so this walkthrough adds no binary weight.
They reuse the CC0 Poly Haven wood, marble, and concrete maps above plus the existing CC0 Sofa 01,
CoffeeTable 01, and ArmChair 01 hero props. All remaining cabinets, sanitary fixtures, appliances,
lights, mirrors, stairs, rugs, and room shells are original runtime geometry created for this site.

### ⚠️ Villa centerpiece — **user must supply a GLB** (the one gating dependency)
No CC0 luxury-villa / house model exists at production quality anywhere downloadable (Poly Haven has
**no buildings** — only props, furniture, doors, windows, facades; Sketchfab CC0 requires an
authenticated download). Poly Haven's closest architectural GLB is `modular_urban_apartments_facade`
— a real building facade, but urban apartments, **not** a luxury villa, so it is *not* used.

**To drop in your villa:** put the exported GLB at `models/villa/villa.glb`, then in
`lib/cinematic/world.ts::enrichWorld()` load it via `loadModel(loader, 'villa/villa.glb')`, add
`.scene` to the scene, and hide the procedural `villa.root` shell. The seam is already proven by the
5 real GLBs above — no engine change is required, only the asset + those ~3 lines. Recommended source:
a purchased CGTrader/TurboSquid archviz villa, or a Blender/Revit export of the actual project design.

## Follow-ups
- **KTX2/Basis compression** of the textures (needs `toktx`/`gltf-transform`, not installed here) would
  cut GPU memory ~4–6×. Currently JPG at 1K.
- Per-scene HDRI swap (dawn → golden → evening) is wired to a single warm env for performance; the
  `dawn_1k.hdr` is downloaded and ready to swap in `enrichWorld`.
