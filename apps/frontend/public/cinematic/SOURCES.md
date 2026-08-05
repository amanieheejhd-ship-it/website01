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

## Models — `models/` (GLB, DRACO/KTX2/meshopt) — **loader seam**
Drop real/purchased GLBs here and load them via `lib/cinematic/assets.ts::loadModel()` (GLTFLoader +
DRACO + KTX2 + meshopt). On any load failure the scene keeps its procedural geometry. No CC0
luxury-villa GLB exists at production quality — the exterior/interior use the realistic-material
procedural build; a specific villa model can be dropped in here without touching the engine.

## Follow-ups
- **KTX2/Basis compression** of the textures (needs `toktx`/`gltf-transform`, not installed here) would
  cut GPU memory ~4–6×. Currently JPG at 1K.
- Per-scene HDRI swap (dawn → golden → evening) is wired to a single warm env for performance; the
  `dawn_1k.hdr` is downloaded and ready to swap in `enrichWorld`.
