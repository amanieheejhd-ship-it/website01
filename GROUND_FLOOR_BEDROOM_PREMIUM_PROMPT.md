TASK: UPGRADE THE EXISTING GROUND-FLOOR BEDROOM + ATTACHED WASHROOM TO A MUCH MORE PREMIUM, SPACIOUS, REALISTIC LUXURY INTERIOR

IMPORTANT:
Work directly on the CURRENT codebase.
Do not create a separate demo.
Do not replace or disturb the already-working cinematic website.
Do not change backend/admin/API/database.
Do not redesign unrelated rooms.

The current cinematic flow is now mostly working.
I only want the EXISTING ground-floor bedroom and its attached washroom upgraded significantly.

============================================================
FIRST: INSPECT CURRENT IMPLEMENTATION
============================================================

Before modifying anything, inspect the actual current source, especially:

apps/frontend/src/lib/cinematic/world.ts
apps/frontend/src/lib/cinematic/scenes.ts
apps/frontend/src/lib/cinematic/director.ts

Also inspect any helper/material/batching code used by these files.

Find the CURRENT authoritative implementation for:

- ground-floor bedroom
- bedroom bed
- bedroom feature wall
- wardrobe
- bedroom door pivot
- attached washroom
- washroom door pivot
- camera route through this bedroom
- static batching / mergeGeometries
- room visibility logic

Do not assume old V14/V15/V16/V17/V18 patches are authoritative.
Use the source that is actually running now.

============================================================
DO NOT BREAK THE CURRENT WORKING FLOW
============================================================

Preserve this sequence:

Living room
→ Dining
→ Kitchen
→ Leave kitchen
→ Move toward ground-floor bedroom
→ Bedroom door opens on approach
→ Enter bedroom
→ Explore bedroom
→ Enter attached washroom
→ Explore washroom
→ Exit washroom
→ Exit bedroom
→ Continue toward outside
→ Exterior staircase
→ First floor

Do NOT destroy this sequence.

The main task now is VISUAL QUALITY + ROOM SIZE.

============================================================
1. MAKE THE GROUND-FLOOR BEDROOM BIGGER
============================================================

The existing bedroom still feels too compact.

Expand/recompose it intelligently within the available villa footprint.

The room should visibly feel:

- wider
- deeper
- less cramped
- better proportioned
- like a premium villa bedroom

Do not simply scale everything randomly.

Maintain believable architecture and circulation.

There must be enough walking space:

- around the bed
- between bed and wardrobe
- near the entrance
- toward attached washroom
- around bedside tables

Prevent collisions with:

- living room
- kitchen
- dining
- exterior walls
- staircase
- other existing rooms

Everything must remain inside the villa footprint.

============================================================
2. COMPLETELY IMPROVE THE BED
============================================================

The current bed must NOT look like stacked boxes, slabs or stones.

This is one of the most important changes.

Build a much more believable luxury king-size bed.

The bed should include:

- elegant floating or upholstered bed frame
- realistic mattress proportions
- softer visual profile
- premium upholstered base
- large padded headboard
- layered headboard panels
- two or more proper pillows
- additional accent cushions if appropriate
- visible duvet/comforter layering
- folded runner at foot
- realistic bedside clearance
- subtle shadow gap / floating-base feeling

Use beveled/rounded geometry where practical.

If current box helper only creates hard-edged blocks, create dedicated Three.js meshes using suitable geometry so the bed does NOT look like construction blocks.

Use rounded or softened geometry for:

- mattress
- pillows
- upholstered bed base
- bench
- cushions

Do not overdo polygon count.

The bed must immediately read as a luxury BED.

============================================================
3. BED FEATURE WALL MUST LOOK EXPENSIVE
============================================================

Create a proper premium architectural wall behind the bed.

Use a balanced combination of:

- full-width upholstered headboard composition
- walnut or dark wood panels
- vertical timber slats
- premium warm stone / marble panel
- thin bronze/brass trims
- concealed warm LED strips
- symmetrical bedside composition

The feature wall should be the visual hero when camera enters the room.

It should NOT look like random disconnected rectangles.

Maintain proper alignment and symmetry.

============================================================
4. PREMIUM FALSE CEILING
============================================================

Redesign the bedroom ceiling to feel luxury.

Use:

- layered false ceiling
- recessed centre
- perimeter drop
- concealed warm cove lighting
- subtle downlights
- possibly one elegant central decorative light if visually appropriate

Do NOT use huge glowing balls.

Lighting should be warm, controlled and architectural.

Avoid washing the entire room in excessive brightness.

============================================================
5. PREMIUM FLOOR + RUG
============================================================

Improve the bedroom flooring.

Use a premium combination such as:

- warm timber / engineered wood
OR
- premium large-format stone with warmer bedroom treatment

Add a large elegant rug around/under the bed.

The rug should have proper proportions and should visually ground the bed.

Do not create a tiny floating rug.

============================================================
6. BEDSIDE TABLES + LIGHTING
============================================================

Create proper bedside tables on both sides where space allows.

Use:

- floating walnut drawer/table
- slim stone top
- bronze details
- soft bedside lighting

Lamps should look like actual decorative lamps.

Avoid primitive sphere-on-stick appearance if possible.

Use more refined combinations of:

- cylinders
- cones
- softened forms
- warm emissive shades

============================================================
7. WARDROBE / DRESSING ZONE
============================================================

Upgrade the wardrobe significantly.

Create a premium full-height wardrobe with:

- proper depth
- walnut / dark veneer panels
- several door divisions
- slim bronze handles
- shadow gaps
- optional tinted/mirrored panel
- integrated warm vertical lighting where appropriate

It should look like built-in luxury cabinetry.

Do not make it look like several random flat boxes.

Also create a coordinated dressing/vanity zone if space allows:

- floating dresser
- mirror
- stool/ottoman
- warm mirror light
- small decor object

============================================================
8. PREMIUM ACCESSORIES
============================================================

Add controlled high-end accessories.

Possible elements:

- foot-of-bed upholstered bench
- one premium plant
- artwork
- sculptural decor
- subtle side console
- decorative vase
- curtains or architectural screen if relevant

Keep the room elegant and uncluttered.

Do not fill every empty space.

============================================================
9. MAKE ATTACHED WASHROOM BIGGER AND MUCH MORE PREMIUM
============================================================

The attached washroom also needs a major visual upgrade.

It should feel like a premium hotel/villa ensuite.

Improve its usable size if the current footprint permits.

Create:

- premium tiled/stone floor
- floor-to-ceiling wall finish
- large floating vanity
- premium countertop
- proper basin
- realistic faucet
- large mirror
- warm backlit/mirror light
- wall-mounted or premium WC
- glass shower enclosure
- rainfall shower
- hand shower / shower controls
- small recessed niche
- towel detail if appropriate
- bronze/brass accents
- subtle ceiling lighting

The washroom should have a coherent material palette.

Avoid crude boxes that read as placeholders.

============================================================
10. GLASS SHOWER
============================================================

The shower should clearly read as an enclosed luxury shower area.

Use:

- transparent/tinted glass
- thin dark or bronze frame
- shower head
- vertical rail
- mixer controls
- floor drain/detail if practical
- stone shower wall

Prevent glass z-fighting.

============================================================
11. BEDROOM DOOR BEHAVIOUR MUST REMAIN CORRECT
============================================================

Very important:

When user is still in:

- living room
- dining
- kitchen

the ground-floor bedroom door should remain CLOSED.

The bedroom must not look permanently exposed.

Only when camera approaches the bedroom entrance after kitchen/dining:

→ bedroom door smoothly opens.

Camera enters.

After bedroom/washroom sequence and camera exits:

→ bedroom door should close again.

Do not leave it permanently open.

Door must pivot from its physical hinge.

Do not rotate around the centre.

============================================================
12. ATTACHED WASHROOM DOOR
============================================================

Washroom door should also behave naturally.

Initially closed.

When camera approaches attached washroom:

→ open smoothly.

After camera leaves washroom:

→ close smoothly.

Reverse scrolling must continue to behave correctly.

============================================================
13. KEEP ANIMATED DOORS OUT OF STATIC BATCHING
============================================================

Inspect current static geometry batching / mergeGeometries logic.

Bedroom door and washroom door must remain live animated objects.

If necessary:

- detach pivot before batching
- batch static room geometry
- reattach door pivot afterward

Do not duplicate doors.

Do not leave an old baked-open door behind.

Verify visually.

============================================================
14. IMPROVE BEDROOM CAMERA COMPOSITION AFTER REDESIGN
============================================================

Because room dimensions and furniture are changing, inspect Scene 8 camera positions.

Adjust only if necessary.

The bedroom cinematic should clearly show:

1. doorway reveal
2. premium bed + feature wall hero angle
3. second angle showing bed depth
4. wardrobe/dressing side
5. wider full-room view
6. approach toward attached washroom
7. washroom vanity
8. shower/WC composition
9. return into bedroom
10. exit bedroom

The camera must never:

- enter walls
- intersect bed
- intersect wardrobe
- clip through doors
- look outside the villa accidentally
- teleport aggressively

Use smooth interpolation.

============================================================
15. MATERIAL QUALITY
============================================================

Use a coordinated luxury palette:

Warm ivory
Soft beige
Walnut
Dark espresso wood
Travertine / warm stone
Muted bronze / brass
Soft grey/beige fabric
Warm 2700K–3000K type lighting

Avoid:

- excessive pure white
- excessive black
- bright yellow gold everywhere
- random color combinations

The bedroom should visually belong to the existing Ansari Space Craft villa.

============================================================
16. PERFORMANCE
============================================================

Do not destroy current performance.

Reuse materials where sensible.

Batch static geometry.

Keep animated objects separate.

Do not add hundreds of unnecessary lights or extremely high-poly meshes.

Maintain the current adaptive-quality strategy.

============================================================
17. CLEAN UP OLD/DUPLICATE BEDROOM GEOMETRY
============================================================

Before adding new components, inspect whether the current bedroom already contains:

- old bed
- old mattress
- old feature wall
- old wardrobe
- old bathroom fixtures
- old doors

Replace/rework the authoritative objects.

Do NOT simply add a second luxury room on top of the old one.

There must be ONE final ground-floor bedroom.

No duplicated bed.
No duplicated wardrobe.
No duplicated bathroom.
No overlapping walls.
No duplicate doors.

============================================================
18. DO NOT CHANGE UNRELATED SYSTEMS
============================================================

Do not change:

- backend
- database
- admin
- APIs
- authentication
- Next.js version
- React version
- unrelated villa rooms

Do not remove existing working cinematic scenes.

============================================================
19. VALIDATION IS MANDATORY
============================================================

After editing run:

pnpm nx run frontend:typecheck

Then run the frontend build using the project's correct Nx build target.

Fix ALL errors caused by this change.

Also verify there are no new errors such as:

- mergeGeometries failed
- incompatible attributes
- duplicate identifier
- undefined material
- Three.js runtime errors
- GSAP timeline errors
- camera route errors

============================================================
20. VISUAL VERIFICATION IS MANDATORY
============================================================

Do not declare completion based only on TypeScript/build.

Run the website locally and visually inspect the actual cinematic.

Verify screenshots/views for:

A. Living room:
Bedroom door CLOSED.

B. Kitchen:
Bedroom door still CLOSED.

C. Bedroom approach:
Door opening.

D. Bedroom hero:
New large luxury bed clearly visible.

E. Full bedroom:
Room visibly larger and premium.

F. Wardrobe/dressing:
Proper premium cabinetry.

G. Ensuite:
Premium vanity + mirror visible.

H. Shower:
Glass shower/WC area visible.

I. Bedroom exit:
No clipping.

J. After exit:
Bedroom door CLOSED again.

K. Exterior staircase:
Existing continuation still works.

If any of these look bad, continue fixing before reporting completion.

============================================================
21. FINAL QUALITY BAR
============================================================

This should NOT look like a basic Three.js prototype.

The visual target is:

premium contemporary Indian luxury villa
+
high-end architectural visualization
+
luxury hotel bedroom
+
warm cinematic lighting

Within the capabilities of the existing procedural Three.js system.

The BED especially must stop looking like somebody placed stone slabs or boxes inside the room.

Prioritize:
proportions
layering
materials
lighting
composition
depth
architectural detailing

============================================================
22. FINAL RESPONSE
============================================================

When completely finished report:

- exact files changed
- bedroom dimensions/footprint changes
- bed redesign details
- feature-wall changes
- wardrobe/dressing changes
- false-ceiling changes
- lighting changes
- attached washroom changes
- bedroom-door behavior
- washroom-door behavior
- camera-route changes
- typecheck result
- build result
- browser-console result
- visual-verification screenshot paths

DO NOT just analyze the task.
DO NOT stop after making only one or two objects.
DO NOT give me another prompt.
DO NOT ask me to manually modify files.

Inspect the current repository, implement everything directly, test it, run it, visually verify it, and finish the ground-floor bedroom + ensuite to production quality.
