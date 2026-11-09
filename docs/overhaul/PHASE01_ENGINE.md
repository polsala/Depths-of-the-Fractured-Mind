# Phase 01 — Three.js viewport and the Intake Bell

Implementation record, 2026-11-09. This is an integrated development build, **not golden-room artistic approval or public-release clearance**. See [evidence](evidence/phase01/README.md), [quality gates](QUALITY_GATES.md) and [progress](PROGRESS.md) for measured results and outstanding reviews. Phase 00 remains the before reference; its evidence and v1 fixtures were not regenerated.

## Decisions and boundaries

The user's Phase-01 instruction supersedes Phase-00 ADR-01. Pinned Three.js 0.187.0 `WebGLRenderer` is the primary exploration viewport. Actual 3D floors, ceilings, wall faces, framed shutters, stairs, props and depth-tested sprite cards replace the raycaster on supported browsers. TypeScript/Vite, the static `/Depths-of-the-Fractured-Mind/` base, combat renderer and controller remain. No unrelated engine or parallel RPG state was introduced.

| Responsibility | Implementation | Contract |
| --- | --- | --- |
| Rules, collision, rewards, events, turn order | `src/game/index.ts`, existing `game/combat/`, `game/events/` | Commit an integer cell/facing once; presentation never decides a hit, pickup, event, map or reward |
| Authored world and interaction IDs | `game/exploration/authored/depth1-intake.ts` | New runs select `depth1-intake-v1`; loaded legacy maps retain their saved layout |
| Input intent | `ui/exploration-commands.ts`, `ui/app.ts` | Keyboard/touch use the same dispatcher; one buffered intent, discarded on modal/mode/settings/blur boundaries |
| Read-only scene snapshot | `graphics/dungeon/types.ts` | Copies/freeze current cached map, location and flags; no party mutation, RNG or generation |
| Viewport/backend ownership | `graphics/DungeonViewport.ts` | Lazy import, loading gate, backend status, readiness, fallback and disposal |
| Renderer and frame loop | `graphics/dungeon/DungeonRenderer.ts` | One WebGL2 context and RAF loop per active exploration shell; resize, quality, context-loss handling |
| Camera timeline | `graphics/dungeon/CameraRig.ts` | 280 ms cell / 220 ms quarter-turn, smoothstep, no overshoot/bob/sway; reduced motion snaps |
| Geometry and moving parts | `graphics/dungeon/SceneBuilder.ts` | Static material/geometry instancing once per depth; only shutter/fan/meter/cover/record state updates |
| Material family | `MaterialLibrary.ts` | Painted concrete, enamel, steel, brass, paper, cloth, practical emissives and authored sign textures |
| Light and atmosphere | `LightingSystem.ts` | Readable hemisphere floor, two nearby practical lights, admissions task spot and distance fog; no bloom |
| People and perception | `WorldSpriteSystem.ts` | Upright yaw-facing cards, grounded pivots, alpha/depth testing; queue echo uses existing atlas idle frames |
| Asset ownership | `RenderAssetManager.ts` | Current-depth textures only, URL cache, readiness/failure tracking, explicit texture disposal |
| Diagnostics | `PerformanceDiagnostics.ts` | Real RAF and CPU submission timings, warmup, resource counts, lifecycle and frame acknowledgement scope |
| UI/accessibility | Existing DOM `ui/app.ts` and dialogs | Objective, action/result, party summary, touch controls, focus and scalable text remain outside WebGL |

`graphics/map.ts` now refuses to generate a missing depth when given a game cache. Both backends project already-created maps. Legacy `renderer.ts` no longer eagerly generates depths 1–5. Frozen-save browser assertions verify that displaying a loaded v1 checkpoint preserves its maps and random state. This intentionally removes presentation's RNG consumption; future controller-generated maps follow the saved stream rather than reproducing an old renderer's incidental future-depth prefetch.

Snapshots are rebuilt on committed actions, not per frame. Scene geometry is not rebuilt for stepping, turning, opening the shutter or receiving the payoff. A mode/depth/quality change deliberately disposes and creates the appropriate presentation shell. The RAF path reuses its camera/scene/material objects; diagnostics allocate their report only when queried.

## Camera, input and interaction

One cell is 2 m; eye height 1.6 m; ceiling underside 2.8 m; vertical FOV 62 degrees; near plane 0.06 m. The institutional release shutter uses a 1.64 m wide / 2.3 m tall leaf; this receiving shutter is wider than the art bible's 1.1 m ordinary-door target. Location/facing commits before interpolation, and saves contain that committed destination. Reload starts at rest. A new event/combat screen disposes exploration rather than continuing stale camera callbacks. A visible DOM loading notice covers the resource/first-render wait when returning to a room.

W/S or up/down move forward/back; A/D or left/right strafe; Q/E turn 90 degrees; F uses the named interaction; T talks to a nearby NPC. Phone controls expose the same moves and a named action button. During loading or movement, only one additional intent is retained. Extra repeated input cannot commit a third action during the same transition. Opening a dialog, opening settings, leaving exploration, blur or tab hiding clears it. Keyboard commands remain blocked inside dialogs/text controls and resume when focus returns to an exploration button. The browser suite reproduces and guards that Inventory-close path. No camera shake, compulsory bob or hidden real-time reaction is added.

The controller supplies the prompt and validates the same feature/range. Most mechanisms require an adjacent facing cell; the admissions counter additionally permits a clear two-cell desk approach, so the landmark can be read without pressing the camera into it. No interaction projects through a wall or locked tile. Required controls have textual results and remain available with muted audio/reduced motion.

## Playable route and persistence

New game starts in Admissions `(4,15)` facing north. The four-slot counting station frames the room through grounded queue rails, with a release-control sign pointing east. The Keeper is beside the entrance. The route is Admissions → queue passage → observation junction → east breaker booth → north shutter → evidence bay → return to the counter. The linen recess is an optional finite medkit/name reward. The displaced queue figure has an inspectable text equivalent and cannot change legal paths.

Operating the breaker permanently opens the real shutter. The evidence feature resolves the existing `first_corpse` choice, then explicitly offers the existing guard + rat encounter. Combat uses existing turn order, abilities, telegraphs, rewards and DOM targets. Flee returns to the junction and persists enemy wounds/deaths; re-entry cannot reroll a fresh reward. Victory recovers Mara Voss's tag. Returning it changes the counter's record, responds to the perception memory, restores 2 SAN to each surviving companion and reveals the onward stair. Existing mandatory guardian/story progression still owns descent. Four protagonists, five campaign depths and ending rules remain.

Save schema is v2 at the existing storage key. v0/v1 parse without invented authored flags or map replacement. New persistent data includes the layout/feature IDs, mechanism/reward/perception flags, exploration notice and escaped encounter. Camera poses, textures, presentation clocks and queued input are transient. Tests cover full inventory, fallen speakers, once-only rewards, blocked/remote interaction, malformed checkpoints and v1 round trips. `tests/fixtures/saves/v1/` is unchanged.

## Rendering and resource policy

Color textures use sRGB, renderer output uses sRGB and ACES tone mapping at exposure 1.15. Sprite cards use nearest filtering; opaque surfaces use mipmapped filtering. No image for depths 2–5 is requested by opening Depth 1. Canvas-authored wear/signage/contact plates are deterministic and do not use gameplay RNG. Props use world coordinates and tile-center clearance; the evidence worker is a restrained authored shroud/face/tag assembly, not a newly commissioned character illustration.

Architecture is instanced by shared geometry/material. No one-mesh-per-tile draw loop, fullscreen postprocessing, bloom or shadow-map render pass is used. Ambient occlusion is limited to authored contact plates; there is no claim of physically accurate global illumination. Practical lights use a fixed shader light count and select nearby fixtures at grid commits. This keeps cost bounded but still needs motion review for light changes at selection boundaries.

Quality presets cap DPR at low 0.8, balanced 1.0 and high 1.5. Low disables MSAA. Balanced/low can lower resolution in 0.15 steps to 0.65 after sustained measured pressure; high keeps its chosen cap. Camera/rules do not change with quality. Screenshot comparisons use DPR 1 and paused presentation, so adaptive resolution does not alter the comparison image. Resize uses actual CSS bounds and updates camera aspect.

Disposal cancels RAF, disconnects `ResizeObserver`, removes the context listener, disposes instancing attributes, shared/custom geometries, materials, cached/generated textures and renderer handles, then releases the context. Partial scene construction also cleans up. A lost/unavailable WebGL2 context switches to a visibly labeled Canvas compatibility viewport with working rules/controls. It remains the backend for that viewport until reload; automatic context restoration is not implemented. This fallback does not count as passing the Three.js gate.

## Evidence and limits

Run `npm test`, `npm run build`, `npm run test:smoke`, `npm run assets:provenance`, `npm run capture:golden`, `npm run baseline:capture` and `npm run bench:dungeon`. `capture:golden` declares desktop 1280×800 and mobile 390×844 at seed 130013/DPR 1, captures viewport + world crop, rejects fallback/missing textures/errors, records transfer/resource/pixel metrics and retains a report on failure. The legacy capture still uses frozen v1 checkpoints at 1280×900 / 390×844. These are separate comparisons, not a claim that the authored room preserves a procedural screenshot.

The Chromium movement benchmark uses real keyboard input, at least five seconds and 45 frames warmup, then a 60-second window per viewport, full motion, desktop 1× and mobile 4× CPU. It follows legal routes to the breaker, evidence bay, counter and shutter instead of merely idling at spawn. It records real RAF intervals (including stalls), CPU render submission, long tasks, resource counts and bounded decoded-texture estimates. Video is opt-in (`DUNGEON_RECORD_VIDEO=1`) and recorded separately from the final timing run; the full input journey is available with `RECORD_GAMEPLAY=1 npm run test:smoke`. Commit-to-frame timing excludes OS input and queued-intent waiting; CDP dispatch duration is separately labeled. Neither is physical input-to-photon latency. GPU timer queries and physical process/GPU memory are not measured. A successful benchmark command means capture completed without backend/browser errors; **the recorded frame-time thresholds still decide D3**, which fails in the retained SwiftShader comparator.

The pinned headless shell exposes WebGL2 through SwiftShader and fails D3 in the retained comparator before the final rail/perception corrections (desktop median/p95 100/200 ms; mobile-4× 33.4/116.7 ms). Render devices were hidden inside the filesystem sandbox but verified outside it. Full Chromium 158.0.8127.18 with its documented `--enable-gpu` headless option uses **Intel Iris Xe (TGL GT2), ANGLE/Mesa OpenGL 4.6**, on the i7-1165G7 host. The final source's complete 60-second routes measure **16.7/16.7 ms median/p95 desktop**, **16.7/16.8 ms mobile-4×**, at DPR 1; CPU submission p95 is 1.2/5.1 ms and commit-to-frame p95 17.6/33.2 ms. This passes the measured desktop and emulated frame budgets, not physical-phone or input-to-photon certification. Planned physical mobile acceptance device: **Google Pixel 6a**, balanced preset, target 30 FPS / p95 ≤40 ms; record its actual OS/browser at that run. It has not been tested here. Hardware, software and probe reports are retained separately.

The optional echo uses an alpha cutoff below its high-SAN opacity, verified with a clear/visible WebGL pixel pair. Its foot pivot is stable beyond the junction threshold, and it dissolves within two metres of the camera instead of occupying the player cell. This avoids an invisible high-SAN sprite and near-camera looming while leaving the ordinary clue and text log available.

Reproduce hardware timing with `DUNGEON_BROWSER_CHANNEL=chromium DUNGEON_ENABLE_GPU=1 DUNGEON_BENCH_OUTPUT=artifacts/phase01/performance-hardware npm run bench:dungeon` after `npx playwright install --no-shell chromium`. This follows [Playwright's full Chromium distinction](https://playwright.dev/docs/browsers) and [Chromium's headless GPU guidance](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/using-gpu-hardware-in-headless-chrome.md). No blocklist override or software-vendor relabeling was used.

Physical phone/process memory, manual reader/listening review, first-time player sessions, complete sprite-family art approval and file-specific legacy rights clearance remain open. Ten GC-controlled legacy screen cycles keep one active renderer and stable 2 geometries / 6 resident textures but JS heap rises about 5.00→6.19 MB; those samples do not prove bounded long-session memory. No deployment or public release was performed. Three.js's MIT notice is retained in `public/THIRD_PARTY_NOTICES.txt`; the 45 unverified distributed media files remain unverified in the provenance ledger.
