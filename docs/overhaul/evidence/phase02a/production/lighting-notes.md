# Phase 02A lighting specialist

Baseline: `a55290ff3755ae802c547d630593870d59514934`, clean `main`. Read-only audit before lead authorization; no generator, saved-map or presence changes.

## Skills actually read

- `/home/psala/.agents/skills/threejs-materials-lighting/SKILL.md` and `references/materials-lights-table.md`: physically based local intensity, PBR response under actual lighting, cool/warm separation, avoid point-light shadow cost. Applied to two motivated sources per room with four fixed non-shadow shader slots.
- `/home/psala/.agents/skills/threejs-scene-setup/SKILL.md` and `references/scene-graph.md`: preserve installed Three.js 0.187.0, metre/right-handed coordinates, shared scene lifetime, no extra loop. Applied to a pure world-metre fixture adapter consumed by architecture and lighting.
- `/home/psala/.agents/skills/game-feel/SKILL.md` and `references/feedback-recipes.md`: proportional transient feedback, eased settling, presentation independent of simulation, reduced motion. Applied to existing 220 ms lighting crossfade, no camera effects, no timers, no gameplay callbacks.

Read AGENTS, PROGRESS, Phase 02 world/design, Phase 01B presence contracts and actual LightingSystem/ArchiveRoomRenderer/RenderAssetManager/DungeonRenderer/type definitions.

## Direct image audit

Retained Phase 02 native images inspected: `1280-normal-{indexing,retrieval,filing-gallery,drum-chamber,exit}-world.png` and `390-normal-secret-world.png`.
Fresh current-build images inspected before edits: `artifacts/phase02a/before/captures/1280-normal-indexing-world.png`, `390-normal-retrieval-world.png`, `1280-normal-filing-gallery-world.png`.

Confirmed: quiet machines and enamel fronts are near-black while large walls are brighter; retrieval tape form disappears on mobile; gallery gives equal dark towers rather than a selected missing-record cue; warm hemisphere and center lamp collapse steel/paper/wall into one brown family; drum papers are bright, missing-section cut edges and spindle very dark. Root cause: all roles used the same center-socket light×3 recipe, and nearest-distance selection could choose another room's light behind a wall.

## Implementation

- `src/graphics/dungeon/ArchiveLighting.ts`: pure presentation adapter exports shared station and gallery anchors plus two practical definitions per room. Existing saved sockets remain unchanged. Warm primary task source sits above the actual wall mechanism; a cooler center strip provides secondary architecture. Gallery focal bay and drum's missing segment get role-specific source positions. Anchors require an actual wall tile (never a locked door) and find a closed off-centre bay when both route centers are open, preventing decoration across legal entrances. No RNG or persisted metadata mutation.
- `LightingSystem.ts`: uses room-specific derived fixtures; room task/fill pair remains selected across legal floor cells; corridors retain a small deterministic distance hysteresis. Four permanent PointLights retain the existing exponential fade. Visible retiring slots cannot be relocated during rapid input; missing selections retry through the existing render update until a slot is dark. Reduced motion snaps sources.
- `tests/archive-lighting.test.ts`: checks every legal room floor cell over four varied seeds, bounded light count, paired fixture stability, metadata/RNG passivity and rapid-transition source retention/recovery; 100-seed check that wall stations and gallery focal bays never occupy an open routed entrance or locked threshold.

## Commands

- `npx vitest run tests/archive-lighting.test.ts`: latest exit 0; 3 tests, 1 file, 243 ms tests /512 ms total on Node/Vitest host. Earlier two-case pass preceded the additional anchor-placement regression.
- Initial `npm run typecheck` during concurrent composition edits failed on that worker's then-unfinished gallery method/import, not on lighting files. Lead must run final integrated typecheck; this is not recorded as a passing command.

## Independent integrated iteration-1 review (role D)

Directly inspected all ten `1280-normal-*-world.png` and all ten `390-normal-*-world.png` in `artifacts/phase02a/iteration1/captures/`. These are actual WebGL2 in-game compositions, not source previews. Material surfaces and station silhouettes improve substantially, with distinct upright tape reels, indexing, restrained filing rhythm and a genuinely open drum void. Hands remain below all primary machines and the drum's ring; no foreground mismatch or clue coverage observed in these samples.

Concrete defects reported to lead: room labels physically occluded by central task hoods (entrance, indexing, evidence, damaged storage, secret and gallery); upper transfer/gallery enamel loses its ink hue at an excessively tight inverse-square hotspot; repeated bright ceiling circles compete with task bodies; drum 07 placard moved from occlusion to top/right cropping in both viewports; the gallery's brightest drawers are above its missing-record row. No premium approval was inferred.

Lead authorized a focused lighting revision: quiet primary moved local x−0.7, forward0.8m (was0.55m); intensity4.2 (was6.4), evidence5, secret4; gallery forward1.15m/intensity8.5 (was0.85m/14). Lead owns narrower hood and sign/placard clearance corrections. `npx vitest run tests/archive-lighting.test.ts` after tuning: exit0,3cases,213ms tests/433ms total; `git diff --check` exit0.

Consecutive frames extracted without starting a browser: `iteration1/motion-review/mobile20s.png` (20.0–21.83s at6fps) and `desktop35s.png` (35.0–36.83s at6fps), both from the retained real-input connected recordings. Also inspected `desktop20s.png`, explicitly a stationary fixture/identity transition sequence rather than connected motion. The connected review retains actual close wall/filing views instead of flattering selected frames; these reveal broad wall texture repetition during lateral travel. No per-frame lighting jump or hand clipping observed in the sampled connected sequences. These frames cannot establish full-route frame pacing or performance; benchmark still required.

Lighting code frozen pending lead's final integrated capture/performance pass. Final visual iteration and performance inspection remain required; no artistic approval is asserted here.
