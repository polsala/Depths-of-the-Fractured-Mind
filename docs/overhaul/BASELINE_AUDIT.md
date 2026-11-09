# Baseline audit — 2026-11-09

## Audit boundary and evidence

Verified local HEAD: **`48d713e1717b7764b4fa2e59c0c1278866627252`**, merge of Pack 08. Initial working tree was clean. The audit inventoried all 248 tracked files, source modules, tests, asset families and both workflows; inspected the key execution paths below; and ran the existing checks. It did not inspect GitHub repository settings, issue status, remote CI results or the hosted deployment. No runtime game source or art was changed in Phase 00.

Persistent evidence: [`evidence/2026-11-09/`](evidence/2026-11-09/README.md). [Tracked tree](evidence/2026-11-09/tracked-tree.txt), [source-symbol index](evidence/2026-11-09/source-symbols.txt), [machine-readable capture report](evidence/2026-11-09/report.json), [repeat comparison](evidence/2026-11-09/comparison.json). Report includes source hashes, lock hash, fixture hashes, browser diagnostics, viewports, canvas sizes and measured data. Source hashes tie the evidence to unchanged gameplay code even though evidence infrastructure was uncommitted at capture time.

## Environment and repeatability

| Setting | Observed value |
| --- | --- |
| Host | Linux x86_64, kernel `7.1.5+kali-amd64` |
| CPU / RAM | Intel i7-1165G7 @ 2.80 GHz, 8 logical CPUs; 31,818 MiB host RAM |
| Node / npm | `v24.13.0` / `11.19.1` |
| Locked tools installed | TypeScript 5.9.3, Vite 7.3.7, Vitest 4.1.12, Playwright 1.65.0 |
| Browser | Playwright Chrome Headless Shell **158.0.8127.18**, revision **1254** |
| Browser setup | Existing revisions did not match lockfile. `npx playwright install chromium-headless-shell` installed the required revision; Playwright used its Ubuntu 24.04 fallback for this Linux distribution |
| Production URL | `http://127.0.0.1:4175/Depths-of-the-Fractured-Mind/` for capture; smoke uses 4173 |
| Scene seed | **130013**, through frozen v1 saves; title has no active run |
| Screens | 1280×900 desktop; 390×844 mobile; DPR 1, en-US, UTC, dark scheme |
| Stable visual settings | Reduced motion, music/SFX zero, fixed decorative `Date.now` at `2026-11-09T12:00:00Z`, separate deterministic fallback texture noise |
| Timing/network | Real `performance.now`/RAF; cold cache via CDP, no network/CPU throttle for captures; separate benchmarks use mobile 4× CPU |
| Capture comparison | Two fresh-context runs, same host/browser; **13/13 PNGs identical, zero changed pixels** |

The screenshot harness initially exposed misleading zero transfer/fake-clock samples during development; those draft reports were replaced. The retained report uses CDP encoded transfer bytes and real frame clocks. This is a measurement correction in the harness, not a game optimization.

## Test and build results

| Check | Result | Evidence / scope |
| --- | --- | --- |
| `npm ci` | PASS — 51 packages installed, 52 audited, no lockfile change | Existing lockfile used; npm noted esbuild's install script policy, but subsequent build worked |
| `npm run typecheck` (via `npm test`) | PASS | [Original combined log](evidence/2026-11-09/npm-test-sandbox.txt); strict check covers `src`, not browser/test utility types |
| `npm run validate:events` | PASS — 83 events, 7 pools, zero errors/warnings, five required beats present | Same combined log |
| Original unit suite | PASS — **53/53**, 8 files | [Unsandboxed result](evidence/2026-11-09/unit-original.txt) |
| Unit suite with new frozen saves | PASS — **58/58**, 9 files | [Compatibility result](evidence/2026-11-09/unit-with-fixtures.txt) |
| `npm run build` | PASS — 54 transformed modules, sprite freshness and asset checks pass | [Build log](evidence/2026-11-09/build.txt); JS 208.81 kB / gzip 61.18 kB; CSS 14.96 kB / gzip 4.13 kB |
| Distribution budget | PASS — **34.0 MiB / 45 MiB**, 25 WebP paths checked | Build checker also rejects source PNG/backup/logo leakage |
| `npm run test:smoke` | PASS — **10/10** Chromium tests | [Browser log](evidence/2026-11-09/smoke.txt); save/resume/import, NPC, endings, native art, touch combat, focus, text scaling and axe scans |
| `npm run bench:combat` | PASS — desktop p95 **0.5 ms**, mobile-4× **1.1 ms** | [Combat log](evidence/2026-11-09/combat-benchmark.txt); 80 warm samples per profile; medians 0.2 / 0.5 ms; ceilings 16.7 / 33 ms |
| `npm run bench:load` | PASS — all title/depth stages recorded | [Load log](evidence/2026-11-09/load-benchmark.txt); production build, 1280×800 / 390×844, CPU 1× / 4× |
| `npm run audit:security` | PASS — zero reported vulnerabilities | [Audit log](evidence/2026-11-09/security.txt); registry access required execution outside sandbox |
| `npm run baseline:capture` | PASS — 6 scenes, no recorded browser/network errors or horizontal overflow | [Capture log](evidence/2026-11-09/capture.txt), report and direct image inspection |
| `npm run assets:provenance` | PASS inventory — 83 media paths/hashes accounted for | [Ledger](ASSET_PROVENANCE.json); this is **not clearance** |
| `npm run assets:provenance -- --release` | **FAIL as expected** — 45 distributed media files unverified | [Release-check log](evidence/2026-11-09/provenance-release.txt); public distribution remains blocked |

Initial sandbox execution could not bind local servers; two subprocess-based validator unit tests also returned restricted output. The same **unmodified original tests** passed outside the sandbox. Browser launch initially failed because the required revision was absent; installing it resolved that environment failure. Preserve [the initial failed attempt](evidence/2026-11-09/npm-test-sandbox.txt); do not mislabel it a fixed gameplay defect or a passing original `npm test` command. Typecheck, events and the final unit invocation passed separately.

`npm ci`, security audit and Chromium installation needed network/tool support available on this host. No unrelated runtime engine or dependency was added. `cwebp` was not found; `ffmpeg` was available. Committed runtime assets suffice for build/check, but source WebP reauthoring requires installing the documented `cwebp` tool. The existing atlas freshness check recomputes and validates all four outputs.

## Screenshots and measured browser observations

All images below were inspected directly through the image viewer, at full-page overview and viewport scale. This is a baseline critique, not visual approval. Both full-page and `*-viewport.png` versions are retained so below-fold usability is not hidden by a tall stitched screenshot.

| Scene | Fixture / location | Saved evidence |
| --- | --- | --- |
| Title | Empty storage; no active run | [Viewport](evidence/2026-11-09/title-viewport.png) · [Full](evidence/2026-11-09/title.png) |
| First room | Frozen exploration; Depth 1 **(48,18), north** | [Viewport](evidence/2026-11-09/first-room-viewport.png) · [Full](evidence/2026-11-09/first-room.png) |
| Corridor | Same map; Depth 1 **(42,17), north** | [Viewport](evidence/2026-11-09/corridor-viewport.png) · [Full](evidence/2026-11-09/corridor.png) |
| Combat | Frozen real Depth-1 encounter, two Deranged Guards | [Viewport](evidence/2026-11-09/combat-viewport.png) · [Full](evidence/2026-11-09/combat.png) |
| Inventory/party | Mutated v1 Depth-2 fixture, (24,67), west; medkits and damaged Elias | [Inventory viewport](evidence/2026-11-09/inventory-party-viewport.png) · [Full](evidence/2026-11-09/inventory-party.png) · [Native party crop](evidence/2026-11-09/party.png) |
| Mobile | Frozen Depth-1 exploration, 390×844 touch emulation | [Viewport](evidence/2026-11-09/mobile-viewport.png) · [Full](evidence/2026-11-09/mobile.png) |

Corridor capture is a camera-only reposition to a BFS-reachable straight corridor, with a four-cell clear forward line and side walls. [Checkpoint](evidence/2026-11-09/corridor-checkpoint.json) and route are retained. It does not claim the player traversed that route or resolved its encounters. Combat and inventory are persisted-state inspection fixtures, not claims of a complete human journey.

The retained report has zero console errors/page exceptions/HTTP errors/failed requests/invalid media MIME types across these six scenes. The console contains only successful fallback/event-registration/loading messages. This does not establish missing-asset absence in every ending/scene. Existing smoke also checked optimized-art requests and all four atlases.

Cold, muted capture bytes (includes HTML): title **82,225 B (80.3 KiB)**; first room/mobile **1,092,881 B (1067.3 KiB)**. The initial exploration checkpoint resumes directly; the existing smoke separately checks title→new-run transfer. Both stay below existing non-audio ceilings. Across six captured scenes, sampled JS heap was roughly **2.8–9.9 MiB**, idle RAF p95 roughly **16.7–16.8 ms**. These are not movement costs or peak memory.

Existing load benchmark includes music and unseeded generation: desktop title/depth-1 cumulative **1715 / 2812 KiB**, mobile-4× **2098 / 3196 KiB**; maximum sampled JS heap across all depths **14.0 / 12.3 MiB**. Audio range requests differ by browser/cache; benchmark profile is diagnostic and not the fixed-seed visual comparator. Some checks ran concurrently on this development host; repeat serially for future fine performance comparisons. Warm combat render timing excludes end-to-end input, compositing and actual phone behavior.

### WebGL2 result

`canvas.getContext('webgl2')` **succeeded** in the actual Playwright Chromium session using default launch settings. Version: `WebGL 2.0 (OpenGL ES 3.0 Chromium)`. Renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`; vendor Google. This is software rendering. The game itself still uses Canvas 2D. Hardware acceleration, a physical handset and a no-WebGL path for any future renderer remain unmeasured.

## Verified source findings

| Area / files | Verified implementation | Consequence / retained decision |
| --- | --- | --- |
| `src/graphics/renderer.ts` | Per-column DDA wall rays and perpendicular-distance projection; row-scaled floor/ceiling patterns; 60° FOV; no mesh/WebGL engine | Preserve genuine perspective. Floor/ceiling transforms do not use camera ray direction; near-wall texture cropping and metric projection need focused correction |
| `renderer.ts` billboard loops | Props/NPCs only tested along the exact forward tile line; fixed centered x, heuristic floor anchor, ≥24 px size; no wall-depth clipping | Off-axis objects disappear; objects behind occluders can draw. This is a source-verified risk, not a claim reproduced in every captured view |
| `renderer.ts` initialization | `createRenderContext` projects all five depths via `generateDepthMap`; missing maps are created through the shared game cache | Rendering changes maps/RNG cadence. A renderer refactor needs actual UI legacy-save evidence, not only a unit round-trip |
| `src/graphics/map.ts` | Converts passability/features, but `isDoorTile` only recognizes stairs; drops discovered/locked state | Actual door appearance and fog-of-war semantics need correction. Keep `DepthMap` authoritative |
| `src/game/exploration/map-generator.ts` | Rejection-sampled rectangles joined with random L-corridors; 60²→100² cells across depths; random features; Keeper adjacent to Depth-1 start | Comment says BSP, implementation is not BSP. No authored room purposes, landmarks or paced encounter sequence |
| Same generator | `ensureConnectivity` flood-fills and warns below 90%; does not actually repair disconnected tiles | Do not rely on its comments claiming connectivity repair. Required routes need explicit tests; the existing seeded progression tests do pass their samples |
| `src/game/exploration/movement.ts` | Immediate discrete moves/strafe; locked doors block; pickups/chests/traps/events/combat resolve on entry; stairs gate required beats and bosses | Working grid rules should stay. No animated camera or interactive environmental mechanism loop exists |
| `src/game/index.ts` / `random.ts` | Controller owns state/actions, async JSON load, v1 snapshot, single module-level xorshift stream; 2% procedural event roll after cooldown | Preserve controller; isolate presentation randomness and avoid additional controllers sharing a live global RNG stream |
| `src/game/save.ts` | Version 1, v0 defaults, JSON Maps/Sets conversion, RNG/event cooldown, import-before-write validation, combat party relinking | Useful persistence foundation; nested fields, stat bounds and duplicate identities/maps are not exhaustively validated |
| `src/game/events/*`, `public/data/events.json` | 83 events/7 pools, prereqs and atomic inventory transactions, completion flags, five fallback beats and required stair ordering | Preserve event engine/content. Early first evidence can be chosen by procedural priority; stair guarantees it before guardian. No authored spatial first-room evidence staging yet |
| `src/game/combat/*`, `abilities.ts`, `enemies.ts` | 15 enemies including five guardians; turn order, committed intents, taunt/defend, finite status/buff durations, victory XP/loot, no boss fleeing | Tactical foundation already exists; tests include policies and seeded campaign walk. Human fun/readability still open |
| `sanity.ts`, event/combat effects, `state.ts` | Per-character SAN stages and mechanical costs/effects; narrative flags; no dedicated pairwise relationship state | SAN is not yet a coherent exploration-perception system. Do not present global morality as a completed relationship model |
| `story.ts`, `objectives.ts`, `endings.ts`, `dialogue.ts` | Four named protagonists, Keeper branch and later clue, required story beats, four ordinary outcomes and hidden evidence route | Preserve narrative identities and ending conditions. Existing tests verify independent routes and a seeded no-debug controller campaign |
| `src/assets/*`, `src/graphics/party-ui.ts`, `combat-ui.ts` | Four derived 512² RGBA hero atlases, 128×160 cells, reused pose states; 15 code-authored enemy silhouette families | Do not rewrite atlas pipeline. Existing appearance/pose reuse is provisional; no commissioned final-art approval is evidenced |
| `src/ui/app.ts`, screens, CSS, platform/mobile utilities | 2698-line UI module; preserved exploration shell; action handlers and Canvas rendering; accessible summaries/dialogs/settings; visible debug tools in production | Keep working DOM accessibility. Focus subsequent refactors around actual flow; compact HUD and gate cheats without breaking QA access |
| `src/ui/audio.ts`, `src/game/sound.ts` | Semantic sink, eight Ogg music tracks/seven SFX, 800 ms crossfade, persistent volumes, three-voice cap, attenuation for hot clips | Reuse system. Several cues share clips; no measured final mixed-output/physical-speaker sign-off in this audit |
| `source-assets/`, `public/`, pipeline utilities | Original PNGs separate from optimized WebP/atlases; unused door PNGs and older boss image remain source-only; empty animation directories are placeholders | File/directory presence is not content completeness. `hero-art-bible` and `audio-performance` explicitly call rights/quality approval pending |
| `playwright.config.ts`, `tests/` | Three selected browser spec files (10 tests); eight original unit files (53 tests); axe/reflow/touch/focus/budgets; new file adds five frozen-save cases | Extend existing suite; tests are not a visual quality or human play certificate |
| `.github/workflows/ci.yml` / `deploy.yml` | CI on PR/feature pushes validates type/build/events/unit/browser/security; Pages deployment on main builds but does not depend on full CI aggregate | No remote setting/branch-protection verification. Full tested-build and rights gating must precede a future public release |

Unused Vite/TypeScript demo remnants (`counter.ts`, SVGs) exist but are not the current entry flow. They do not justify a foundation rewrite.

## Visual defect register

| ID | Directly observed / source-backed finding | Severity / next phase |
| --- | --- | --- |
| V01 | Title Import Save label/native file control overlap the button row and clip its right side at 1280×900 | S1, focused UI fix in Phase 01 |
| V02 | Desktop exploration sidebar makes a very tall page; party, inventory, Talk and save controls fall below the initial viewport; world panel stretches into a large empty black column | S1, Phase 02 HUD composition |
| V03 | Desktop combat action grid falls below the 900 px viewport even though mobile combat tests pass | S1, Phase 02; add desktop bounds regression |
| V04 | Corridor has repeated warning tiles, broadly even lighting and fantasy-style sconces in an institutional interior; no distinctive landmark | S1, Phase 01 purpose/blockout then Phase 03 art |
| V05 | Strong diagonal texture appearance on floor/ceiling conflicts with wall perspective and material scale | S1, Phase 02 projection plus Phase 03 textures |
| V06 | Soft chibi-like protagonist sprites, detailed vendor/keeper and glowing flat enemy silhouettes have inconsistent scale/edge/style | S1, Phase 03 single reference family |
| V07 | Mobile world and movement controls fit, but map/party/context actions require a long vertical journey; numeric location/debug controls dominate much of the page | S1 composition; preserve tested touch/reflow behavior |
| V08 | Minimap reveals unvisited neighboring structure because discovered state is dropped; source confirms fog is not honored | S1 exploration-information rules in Phase 02 |

No audio listening sign-off, unassisted human play sessions, physical phone/GPU testing, final animation/art approval or commercial rights clearance was performed. These remain open gates, not hidden caveats.

## Phase-00 additions and final decisions

Added the seven production-contract documents and root `AGENTS.md`; deterministic production capture, zero-pixel comparator, file-level provenance ledger/check; five immutable version-1 save fixtures with real continuation tests; CI capture/provenance and retained artifacts. Existing CI budgets/accessibility checks remain intact. Existing runtime code is preserved.

Final architecture: evolve the current raycaster/DOM/controller boundary, make maps and gameplay RNG independent of rendering, author the first slice before procedural expansion, interpolate presentation over committed grid moves, retain event/combat/save/asset/audio contracts and migrate only durable state. Exact Phase-01 implementation and slice beats are in [the roadmap](PRODUCTION_ROADMAP.md#exact-next-implementation-step).
