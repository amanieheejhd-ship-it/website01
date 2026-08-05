# Hybrid walkthrough — scroll-scrubbed frame sequence

The **hybrid cinematic path**: a pre-rendered photoreal luxury-villa walkthrough is exported to a
numbered image sequence and scrubbed by scroll. This achieves the UE5/Cycles look (rendered offline,
not real-time) while running smoothly on weak hardware — the browser only does one `drawImage` per
changed frame, using ~zero GPU 3D budget. Use this where the live three.js scene can't hold (the dense
furnished interior walkthrough); keep real-time three.js for the lighter exterior/hero moment.

## Why frame-sequence and not `<video>`
Scrubbing an H.264 `<video>` by `currentTime` is janky (seeks snap to sparse keyframes). A JPEG/WebP
frame sequence drawn to canvas scrubs perfectly forward *and* backward — the technique Apple uses on
its product pages. Verified on the dev laptop: **~51 fps scrub** at full rapid sweep.

## Producing frames from your render (the drop-in seam)
1. Render the walkthrough to an MP4/MOV (Blender Cycles, UE5 Movie Render Queue, or a purchased clip).
2. Extract a numbered sequence into `frames/` (target 48–240 frames — more = smoother, heavier):
   ```
   ffmpeg -i walkthrough.mp4 -vf "fps=24,scale=1920:-1" -q:v 4 frames/frame_%03d.jpg
   ```
   (WebP `-c:v libwebp -q:v 70 frames/frame_%03d.webp` is ~30% smaller; set `ext="webp"`.)
3. Set the count/pacing where the component is used:
   ```tsx
   <WalkthroughScrubber
     frameCount={/* number of frames */} basePath="/cinematic/walkthrough/frames/frame_"
     ext="jpg" perFrameVh={60}
     captions={{ 0: 'The neighborhood', 18: 'Arrive home', 30: 'Step inside' /* ... */ }}
   />
   ```
   Component: `apps/frontend/src/components/cinematic/walkthrough-scrubber.tsx`. It is SSR-safe and
   falls back to a single static poster frame under `prefers-reduced-motion`.

## Current contents (mechanism proof — REPLACE these)
`frames/frame_000.jpg … frame_047.jpg` — **placeholder** frames captured from the current real-time
three.js scene (48 frames, ~4.3 MB, avg 88 KB). They prove the scrubber; they are **not** the
photoreal deliverable. Drop your rendered frames in and delete these.

## Payload / performance
- 48 frames ≈ 4.3 MB. A 180-frame 1080p JPEG sequence ≈ 15–25 MB — lazy-loaded after the interaction
  gate, so LCP is unaffected. Show the loader (built into the component) while preloading.
- Consider splitting into per-room sub-sequences loaded on demand for very long walkthroughs.

## Assets / licensing
Placeholder frames are renders of this repo's own scene (no third-party license). Your final render's
license is whatever you produce/purchase — record it here when you drop it in.

- `index.html` — standalone scrubber demo (open directly / serve statically) used to verify the mechanism.
- Binaries in `frames/` are git-ignored (see repo `.gitignore` `apps/frontend/public/cinematic/**`).
