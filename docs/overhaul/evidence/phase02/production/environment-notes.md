# Archive environment implementation notes — 2026-11-10

Parent baseline: clean main at 96a2d0aae7c3384379885624d6df687275e5db5f. No commit, push, deploy, fixture or character-art change.

## Installed resources actually read

- `/home/psala/.agents/skills/threejs-game-director/SKILL.md`: preserve existing working application; coordinator consolidates specialist work; inspect active-game scenes; no automatic premium certification.
- `/home/psala/.agents/skills/threejs-scene-setup/SKILL.md` and `references/scene-graph.md`: retain installed Three.js 0.187.0 (not skill default r186), existing loop/CameraRig, world metres, owner disposes generated geometries/textures. No new scaffold/camera/clock.
- `/home/psala/.agents/skills/create-game-assets/SKILL.md` and `references/art-direction.md`, `references/provenance.md`: coherent broad forms/value groups at native game scale; original code-authored architecture and surfaces, no external media import; technical fit/provenance separate from human approval.
- `/home/psala/.agents/skills/threejs-aaa-graphics-builder/SKILL.md` and `references/authoring-recipes.md`, `references/technical-art.md`, `references/shader-cookbook.md`, `references/visual-scorecard.md`: authored silhouette + chamfer/extrusion + functional details, shared material/batch system, no glow as substitute for geometry, bounded lighting, no added post/shadow passes, inspect declared desktop/mobile scene set before scoring.
- `/home/psala/.agents/skills/threejs-materials-lighting/SKILL.md`: sRGB color maps, PBR roughness/material separation, no repeated shadow point-lights.

No external asset-generation call or skill script executed in this subtask. The implementation uses original procedural kit geometry and surfaces; no unavailable generator claimed used. No browser/API documentation consulted beyond installed source/contracts.

## Architectural decisions influenced / files

- `ArchiveRoomRenderer.ts` is a static room-composition boundary consuming frozen semantic rooms/sockets/real grid only through an `ArchitectureSink`. No RNG, gameplay callbacks or animation clock. Builds shared chamfered filing shells, five/seven drawer rows with tabs and handles, transfer panels, blank index band, twin-spool tape reader, evidence cage, maintenance grille and interrupted service-floor repair. Custom thick curved segmented ring, radial bays, removed south quadrant, exposed cut faces, interrupted tracks and raised plinth form the central drum.
- `SceneBuilder.ts` preserves Intake branch and static instance batching; supports room ceiling proportions and real solid shelf/drum footprints rather than decorating passable cells with barriers. Secure leaf orientation follows corridor. Archive shelves are backed by authoritative blocked cells; wall recess furniture leaves centers/travel lines clear.
- `MaterialLibrary.ts` adds opt-in Archive material family only. Original deterministic 256px concrete/floor surfaces preserve broad groups, clear bay seams and sparse finish changes. Existing new/legacy Intake and old procedural materials retain defaults. New Archive does not load old cabinet-wall texture as generic concrete. Palette umber/paper/ink/task amber is shared across role materials and kit signs. No binary media added.
- `LightingSystem.ts` reads room fixture sockets, warm task / faded cool strip / amber secure profiles. Fixed four permanent point slots with two selected fixtures allow retiring sources to fade in place over 220ms via SceneBuilder's existing elapsed delta. Zero point shadow maps/post passes. Intake keeps its exact two-point source behavior. Four shader slots are a measured tradeoff requiring performance observation; reduced motion snaps static light selection.
- `types.ts` clones/deep-freezes semantic identity at snapshot boundary; no mutable map metadata reference reaches renderer.
- `npc-presentation.ts` explicit own-key Keeper mapping rejects unknown/prototype IDs. `WorldSpriteSystem.ts` renders a clearly labeled appearance-unavailable card for unknown IDs; `DungeonViewport.ts` adds matching DOM status. No NPC identity or follower invented.
- `DungeonRenderer.ts` includes presentationWarnings in read-only diagnostics.
- `tests/archive-presentation.test.ts` proves semantic snapshot isolation/RNG/save preservation, nested freeze, independent subsequent map mutation and safe known/unknown/prototype NPC mappings.

## Executed checks

- `npm run typecheck` after material/snapshot/kit integration: exit 0.
- `npm run typecheck` after shelf/event-location integration: exit 0.
- `npm run test:unit -- tests/archive-presentation.test.ts`: exit 0, script also included full suite, 23 files /112 tests pass (20:09:19 local command output).

## Visual review

Pending first capture pass at note creation. No claim of premium world quality, hand integration, GPU performance, physical device or human artistic approval from code/type checks. Final capture review findings to follow separately.

## Direct first-image rejection / correction

Inspected `test-results/archive-journey-normal-new-0237d-eserves-its-world-on-reload/archive-real-entry.png` from the actual normal new-run depth transition. The entry is excessively dark: near-black transfer machine/ceiling, amber sign low contrast. Hands remain in the lower band and center navigation is clear. Rejected as S1 readability failure. Corrected Archive-only practical strength from socket intensity5/8 to rendered15/24, Hemisphere1.1 with lighter warm ground color; Intake values unchanged. Typecheck exit0. Fresh images still required; no claim correction succeeded yet.

Additional integration: semantic shelf IDs use `archive-shelving-` prefix with defensive missing-room guard. Canvas unknown NPC now uses a neutral explicit appearance-unavailable badge plus DOM status, preserving actual Keeper branch. `DungeonViewport` post-ready disposal guard prevents late UI warnings after shell teardown. Renderer cosmetic composition reads serialized decorationSeed directly for tab grouping/localized removed drawers/paper angle; it does not invoke any RNG.

## Focused review corrections after first image

- Root source review caught secure door orientation guessed from adjacent walls although its tile lies inside an open evidence room. Fixed using semantic edge door ID + actual route approach vector. `archive-presentation.test.ts` checks horizontal/vertical threshold normals across nine seeds. Full unit invocation now 23 files /115 tests, exit0 at20:16:34.
- Root requested removal of generic fantasy cache art in the new Archive. `WorldSpriteSystem` now creates shared original enamel evidence-transit cases at exact feature cells, offset to a corner clear of both legal grid crossing lines. Functional handles, paper label, metal-rim hinged lid and finite paper contents; existing `chest.opened` opens the lid/removes contents immediately. No callback changes state; no new clock. Ordinary legacy maps/sprites unchanged. Explicit dynamic objects built once, not scene rebuilds. New case materials/geometry disposed by owning sprite system.
- Archive-only practical multiplier3/warmer ground fill is still pending fresh image inspection before success can be claimed.

## Lead review at final candidate

The resumed lead directly inspected native 1280/390 entrance, index, compressed aisle, gallery and drum; all ten room crops in a contact sheet; four protagonist drum/interaction pairs; legacy comparison; and sampled connected-motion frames. The missing drum quadrant and compressed filing silhouette distinguish the new space. Hands remain below the landmark and controls; normal/reduced captures carry the same required information. The initial near-black entry was rejected and retained. Final practical/ambient correction restores basic readability; quieter rooms still have shallow material variation and a dark value floor. The gallery's long axis needs a stronger focal composition. These are art-production gates, not concealed passes. No premium/showcase or human acceptance claim.

The additional graph-derived lintels follow actual main/loop thresholds and reuse destination materials with front-facing text. Drum cut-face thickness and file-label readability were refined after the first review pass. Exact-source final captures must supersede the earlier review report. Lead also traced a save-timestamp regression to the old title loading poll: a disconnected title shell could rerender the active exploration shell. A focused title callback guard and delayed-load browser regression preserve the original raw-save assertion; no existing test budget or assertion weakened.
