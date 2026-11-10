# Technical architecture — retain, isolate, prove

Status: Phase-00 historical decisions below are superseded for the viewport by the user's Phase-01 Three.js requirement. [Phase-01 implementation](PHASE01_ENGINE.md) records the current architecture. [Baseline](BASELINE_AUDIT.md) remains an immutable account of the original engine.

## Phase-01 decision amendment

ADR-01 is replaced: use pinned **Three.js 0.187.0 WebGLRenderer** and actual instanced 3D environment geometry for the primary exploration viewport. The original Canvas raycaster is a temporary explicitly labeled compatibility fallback, selected when WebGL2 is unavailable/context-lost or by `?renderer=canvas`. This follows the user's explicit Phase-01 rendering strategy, rather than inferring a switch from capability alone. TypeScript/Vite, the authoritative grid, RPG/controller/combat/event/save contracts and DOM accessibility remain. ADR-02 through ADR-09 still apply; current module responsibilities, integration evidence and unresolved gates are in `PHASE01_ENGINE.md`.

## Verified foundation

Phase-01B amendment: `graphics/presence/PresenceDirector.ts` owns copied scalar character status and a session-only acting clock; `ui/presence-view.ts` owns one transparent input-pass-through DOM layer with explicit RAF disposal. Both the primary WebGL2 and labeled Canvas fallback retain the same passive body presentation. CameraRig and domain rules are unchanged. The viewpoint chosen with party portrait buttons is transient; no save version or RNG boundary changes. `graphics/combat-presentation.ts` shares the 650 ms anticipation/contact/recovery window with combat reactions; HP and accessible results commit immediately, and animation never dispatches an action. `assets/hero-portraits.ts` derives stable head/shoulder crops from hero metadata for HUD/dialogue; portrait status reads the same <30% HP/SAN thresholds. Source art and runtime atlas builds remain separate. See [the complete presence contract](PHASE01B_CHARACTER_PRESENCE.md).

`src/main.ts` initializes `src/ui/app.ts`. The DOM UI calls `GameController` in `src/game/index.ts`. Grid maps and movement live in `src/game/exploration/`; turn-based combat lives in `src/game/combat/`; JSON-driven events and fallback story beats live in `src/game/events/`. `save.ts` serializes Maps/Sets and RNG into version-1 localStorage snapshots. Sound cues cross a semantic sink into `src/ui/audio.ts`.

`src/graphics/renderer.ts` is a genuine Canvas 2D DDA wall raycaster, not a slideshow or mesh/WebGL renderer. `src/graphics/map.ts` adapts `DepthMap` to rendering cells. Combat and party canvases have separate renderers and DOM summaries. TypeScript strict checks and a Vite build target static hosting at `/Depths-of-the-Fractured-Mind/`. No runtime engine dependency is present.

## Decisions and reasons

| ID | Decision | Reason / boundary |
| --- | --- | --- |
| ADR-01 | Keep TypeScript, Vite, Canvas raycasting and DOM UI for the slice | Existing raycasting gives genuine perspective and a small tested foundation. WebGL2 availability alone is not a reason to rewrite. Improve its actual projection, occlusion and authored geometry first. |
| ADR-02 | Retain the controller, combat, event loader, inventory and save repository | They have working progression, transactions, tactical intents and regression coverage. Introduce narrow commands/data at their existing boundaries. No ECS or parallel state store. |
| ADR-03 | Author the opening sequence; keep procedural maps for existing campaigns and later optional spaces | The current random rectangles cannot guarantee deliberate sightlines or pacing. New runs can select an authored layout; loaded v1 maps remain byte-equivalent in meaning. |
| ADR-04 | The game owns map creation and gameplay RNG; rendering receives a read-only scene projection | The current renderer eagerly generates depths 1–5 via `getDepthMap`, consuming the global RNG. Remove that coupling with explicit compatibility tests before changing generation order. Decorative randomness uses a separate stable seed. |
| ADR-05 | Grid actions commit once; a presentation camera interpolates the result | Combat/events/saves operate at discrete boundaries. Camera motion must not duplicate a trap, event, pickup or footstep, or place a save between cells. |
| ADR-06 | Extend versioned saves only for durable new state | Camera interpolation, decoded textures and audio playback remain transient. New layout IDs, mechanism state and relationship memory require a migration and frozen-fixture tests. |
| ADR-07 | Keep an accessible DOM layer over Canvas | Preserve native controls, focus management, text scaling, summaries and muted equivalents. A Canvas UI replacement would discard working accessibility. |
| ADR-08 | Keep committed optimized media and existing budgets | Runtime uses existing URL manifest/base handling. Rebuild source derivatives deterministically with the authoring tools; do not import source art into production. |
| ADR-09 | Separate technical evidence from artistic approval and release clearance | Browser smoke can pass while title controls overlap and sprites clash. A–G review remains mandatory. No automatic public deployment is authorized by this contract. |

## Rendering evolution within the current engine

Introduce a small `DungeonScene` projection at the boundary of `graphics/map.ts`, retaining `DepthMap` as the collision/persistence authority. Proposed data: cell material ID, wall face treatment, door state, landmark/prop records with stable ID, world height, foot pivot and light source. Keep authored presentation metadata separate from mutable gameplay tiles where practical; reference it with a stable layout ID. Do not serialize HTML images, Canvas contexts or GPU handles.

Implementation order:

1. Make visible-map projection passive. Loading or rendering a scene must not change cached maps or RNG. Test render → snapshot and save → restore → next action using the frozen v1 corpus. For older saves with only some depths generated, reproduce the legacy generation boundary explicitly in migration/controller compatibility code; never silently reroll future maps. Test actual legacy browser checkpoints as well as controller fixtures.
2. Unify camera projection: FOV, eye height, wall height, floor/ceiling coordinates and texture density. Fix near-wall clipping so cropped walls do not squash a full texture into the viewport. Floor/ceiling samples must rotate with the camera, rather than just varying row-scale and position offsets.
3. Produce a wall-depth buffer. Project all visible sprites by world position, sort far to near and clip columns against wall depth. Present objects at off-axis positions; prevent objects behind walls from being drawn simply because their tiles share the forward line. Replace the current centered-only billboard loops.
4. Add stable face/material selection, wall recess cues and landmark geometry using the existing grid volume. Doors need real `door` semantics, visible open/closed state and collision synchronization; currently graphics identifies stairs as doors and ignores actual door tiles.
5. Add localized lighting and grounded shadows using a small explicit light list. Drive flicker/decorative motion from an injected presentation time/seed. Profile before caching or moving work to a worker.

The slice's geometry contract is orthogonal rooms, full-height structural walls/pillars, framed openings and 2D props. This is stylized 3D space rendered through rays. Do not promise free vertical traversal, dynamic mirrors or arbitrary mesh architecture with this renderer. If those become necessary, compare a limited WebGL2 renderer behind the same scene interface against the same slice and gates; require measured visual need, a hardware profile and a no-WebGL failure strategy before adopting it. That is a conditional future decision, not a scheduled engine switch.

## Input and movement

Retain WASD/arrows for direction-relative movement and strafing, Q/E for quarter-turns, T for conversation, and the equivalent touch controls. Add an explicit interaction command shared by keyboard and touch in Phase 01 rather than hard-coding another UI-only tile mutation.

Initial timing hypothesis: a one-cell step takes 280 ms, a 90° turn 220 ms, ease-in/out with no overshoot, no compulsory bob. A blocked action gives a small immediate cue within 100 ms and never advances events/RNG. Keep at most one queued command, reject stale repeat inputs on mode changes, and clear the queue when a dialog opens. Reduced motion snaps or shortens the camera transition while preserving game action timing and input acknowledgement. No timed reaction is required during a turn-based decision.

The controller validates the target and applies its consequences once, then presentation animates from previous to committed location. New combat/event modes settle the camera before presenting their controls. Save the committed location; reload starts at rest. Test long key holds, mixed touch/keyboard, input during opening/closing doors, focus return, interrupted movement and resize. Rotation currently mutates state directly from the UI; route new rotation behavior through the controller as part of that focused work.

## Authored maps and mechanisms

Add `src/game/exploration/authored/depth1-intake.ts` with explicit rooms, tile positions, stable feature IDs and beat annotations. Validate against `DepthMap` so movement and existing minimap/rendering can consume it. Add a map selection seam in `exploration/map.ts` for new runs; `getDepthMap` must always return an already-saved map first.

A mechanism is state plus commands: inspect, operate, blocked reason and effect. The release shutter opens only after the accessible breaker is operated; it stays open, cannot consume its own only solution, and has the same state after save/resume. Use controller methods and event effects for rewards and choices; do not mutate collision from the render loop. Interaction range is current/adjacent cell with a clear facing rule, shared by prompt and command validation.

The current `discovered` and visited flags survive saves, but `DungeonMap` drops them and the minimap reveals local unvisited layout. Carry them through projection when implementing exploration information rules; do not imply that existing fog rendering is already correct.

## Narrative, sanity and relationships

Keep JSON event loading, prereq validation, atomic inventory effects, completion IDs, required stair beats and fallback event definitions. Add new slice events to the existing validator/pools or an explicit authored-reference registry; do not create orphan content that passes only through a debug button. Preserve the Depth-2 Keeper clue and all five ending conditions.

SAN remains a per-character resource with existing combat and event effects. Add perception as a presentation decision derived from stable flags and the relevant character stage; log what was perceived. It cannot alter legal paths, erase essential prompts or secretly modify item costs. Optional clues have an ordinary inspect route. Presentation randomness must not affect tactical rolls.

Relationships are presently implied by flags/dialogue, with no dedicated pairwise model. First represent the slice's one trust consequence with a named persistent flag and a later companion response. Expand to typed pairwise memory only when two real encounters need it; migrate older saves with neutral/unknown history. Do not infer a personal approval score from global Mercy/Truth totals.

## Persistence and compatibility

Keep `SAVE_KEY` and current read/import/export behavior until a tested migration deliberately changes them. `parseRun` already handles v0 and rejects future versions. Preserve all four party identities, inventories/equipment, death state, active event/conversation/combat, mutable maps, completion sets, ending prerequisites and deterministic next roll. New save validation should verify duplicate IDs/maps, stat bounds and nested combat data before dereference; the current parser validates only part of that structure.

Frozen corpus: `tests/fixtures/saves/v1/{exploration,event,combat,conversation,progressed}.json` plus SHA-256/next-roll manifest. These are real controller-generated v1 shapes, with explicit fixture mutations for a damaged/equipped Depth-2 party and opened chest. They are not personal user saves or proof of every possible v1 state. `tests/save-fixtures.test.ts` verifies round-trip state, RNG, party relinking and continuation actions. Never regenerate them to make a migration pass.

## Audio and assets

Keep `emitSound` semantic cues and `AudioManager`: 800 ms crossfade, same-track continuity, cancellation, persistent volumes and three voices per recording. Add distinct mechanism/room cues through that boundary. Commission or author cleared recordings before distribution; several current semantic cues share a clip. Final mix, clipping under overlap and physical speaker intelligibility remain unverified. Add buses/limiting only when a measured mix requires them.

`src/assets/manifest.ts` remains the URL authority, including Vite base paths. Hero atlas dimensions/state names stay stable. `utils/check-web-assets.mjs` and existing browser transfer checks retain their ceilings. [The asset ledger](ASSET_PROVENANCE.json) lists every current media file; `npm run assets:provenance` checks inventory/hashes and `-- --release` blocks uncleared distributed files. It does not prove originality of code-authored art or replace dependency-notice review.

## Evidence, build and deployment

`npm run baseline:capture` builds production, opens frozen saves in fresh Chromium contexts, captures full-page and viewport images, records fixture/source hashes, environment, WebGL2 renderer, network/console failures, real idle RAF intervals and sampled JS heap. CDP transfer measurement includes document bytes and disables cache. Visual settings: seed 130013, DPR 1, UTC, en-US, dark scheme, reduced motion and muted audio. Only decorative `Date.now` and fallback visual noise are fixed; timing measurement remains real.

`BASELINE_OUTPUT=artifacts/baseline/repeat npm run baseline:capture` makes a separate comparison set. `node utils/compare-baseline.mjs reference candidate` reports exact PNG pixel differences; it cannot approve art and must not be used across changed browsers as an absolute quality score. Keep benchmarks diagnostic about their scope: existing combat timings measure warmed Canvas calls; load timings include variable audio range transfers and generated layouts.

CI retains lint/build/events/unit/browser/security checks and adds provenance inventory and baseline evidence capture. Deploy workflow currently builds on main without depending on the full CI aggregate. Record this release risk; a subsequent release change must require successful checks and explicit public-distribution clearance before deployment. Phase 00 does not publish, change repository branch protection or claim hosted state was inspected.
