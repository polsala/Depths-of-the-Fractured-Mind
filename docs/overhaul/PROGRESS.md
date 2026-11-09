# Production progress

Updated: 2026-11-09. Phase 01 is retained in a development commit based on Phase-00 commit `13d159b`, at the user's request after validation. Read [PHASE01_ENGINE](PHASE01_ENGINE.md) and [current evidence](evidence/phase01/README.md) before changing the engine. This is a playable development build; artistic approval, physical performance, human play/accessibility and distribution gates remain open. No deployment or push was made. Capture reports record the pre-commit parent; their source/build hashes identify the tested implementation.

## Current Phase-01 implementation

- Primary exploration uses pinned Three.js 0.187.0 `WebGLRenderer`, actual instanced 3D architecture and depth-tested upright sprites. `graphics/DungeonViewport.ts` owns lazy loading/fallback; `graphics/dungeon/` separates scene building, camera, materials, lighting, sprites, asset lifetime and diagnostics. The title does not request Three.js or dungeon textures.
- `game/exploration/authored/depth1-intake.ts` defines a new-run-only 22×20 Intake Bell map. The controller owns breaker/shutter, Keeper/event, optional linen/perception, wounded encounter resume, tag and one-time counter payoff. Existing combat and story/guardian/ending rules remain. `GameController` constructor still supports the original procedural campaign tests; `newGame` deliberately selects the authored start.
- Presentation reads a frozen projection of only the existing current map, scalar flags and living witness SAN stage. It retains no mutable chest/trap/party reference and never generates a map or consumes gameplay RNG. Both WebGL and fallback initialization are passive. v1 saves retain their original map/RNG; the immutable corpus is unchanged. Save v2 adds optional durable authored fields at the existing key.
- `CameraRig` interpolates integer commits over 280 ms steps / 220 ms turns, with no bob/sway and snapping reduced motion. One queued input is shared by keyboard and touch, including during lazy loading. Modal/settings/mode/blur boundaries cancel stale input. Tests cover rapid bursts, strafing/backing, blocked doors, loading, resize, reduced motion and fallback.
- Admissions has a four-slot counter, queue rails, observation window, institutional seats, service spine, practical lighting and animated extractor. The corridor has a named release bend, cut patient-call circuit and removed notices. The breaker meter, physical shutter, evidence worker/overturned chair and payoff record/stair have visible state. These code-authored additions do not clear the retained legacy media.
- UI fixes include separated title import controls, a bounded desktop world/sidebar, compact four-person summaries, contextual F/touch interaction, disclosed portrait vitals, mobile controls in flow, and a shorter combat viewport so actions are reachable. Keyboard movement resumes after Inventory closes and restores focus to its button; movement remains blocked inside dialogs and text controls. Humanoid cards and their contact plates sit clear of the travel lines. Debug mutations require `?qa=1`; normal diagnostics are read-only.
- Evidence tools: `capture:golden` (ten desktop/mobile scene pairs), `bench:dungeon` (60-second actual-input representative route), source/environment metadata, explicit synthetic sprite-occlusion fixtures, error/resource/frame reports, real-input walkthrough recording and ten-cycle renderer lifecycle/heap evidence. `baseline:capture` remains the frozen-v1 compatibility view; opening the new portrait disclosure is its only fixture-flow adjustment.

## Current verification and gates

`npm test` passes **77/77 across 14 files**, including the original tests, immutable v1 corpus, authored route/persistence, frozen snapshot, camera/queue and honest timing/stall accounting. Typecheck and event validation pass (83 events, 7 pools). Production build passes at **34.6/45 MiB**. Lazy renderer chunk is about **593 kB minified / 153 kB gzip**; Vite's >500 kB warning remains visible and budgets were not raised. Provenance inventory passes **83 files / 45 distributed unverified**; Three.js's MIT notice is retained separately.

The **15-test delivery browser suite passes**, including an uncut full-motion, no-cheat intake journey and reload; the **ten final desktop/mobile scene captures** and **six frozen-v1 baseline scenes** report zero errors/failures and were directly inspected. Intel Iris Xe/full Chromium hardware timing passes: median/p95 **16.7/16.7 ms** desktop and **16.7/16.8 ms** for the 4× CPU mobile viewport; software SwiftShader remains a separate failing earlier-revision comparator. Reports, sampled motion frames, screenshots and source hashes are retained in the evidence bundle. Earlier rejected passes, the reproduced Inventory focus regression and the sandbox validator failure are retained; no regression was removed to obtain a pass. Test adaptations open the intentional portrait disclosure, wait for a queued turn to commit, and remove an incompatible layout ID from a synthetic Depth-5 fixture. Accessibility assertions and asset limits remain. CI now captures the authored WebGL2 room and retains its reports; a hosted run has not been observed.

| Area | Current disposition | Approval still needs |
| --- | --- | --- |
| A — Technical | Automated rules, migration, input, backend, pixel occlusion and ten-cycle lifecycle checks pass, with recorded-build evidence | Hosted CI and exhaustive malformed legacy saves remain unobserved |
| B — Visual | Authored room/connector/mechanisms directly inspected and corrected; **not signed off** | Coherent Keeper/hero/guard edge language, more convincing evidence figure, native-size/grayscale/motion art review |
| C — Gameplay | Real-input route, combat, return and reload pass; fair optional perception and finite reward tested | Five uncoached sessions, tactical policy/3–6 round validation and pacing/fun review |
| D — Performance | Download ceiling and measured Intel Iris Xe desktop/emulated frame budgets pass; SwiftShader profile fails and is retained | Physical phone, bounded process/GPU/long-session memory, true input-to-photon and controlled-network certification |
| E — Accessibility | Existing automated axe/focus/touch/reflow suite retained and passing | Manual reader, full alternative-settings route and physical touch review |
| F — Content | All required slice beat types playable; later campaign retained | Art/audio approval, four-voice narrative review and human campaign/slice evidence |
| G — Rights | Inventory and Three.js MIT notice retained; no new binary media imported | File-specific clearance/replacement of 45 legacy distributed files; code-art originality/contributor review. **Public release blocked** |

## Exact next implementation action

Integrate one rights-cleared, stylistically matched **Keeper + guard reference pair** using `WorldSpriteSystem` and the existing combat visual contract, with explicit world height, feet pivot, animation/facing metadata and native-scale crops beside a protagonist. Replace the remaining placeholder-quality figure treatment before extending the room kit to other depths. Then run the same route on a physical phone and moderate five first-time sessions; keep the passing Intel hardware and failing software reports separate, investigate long-session memory and preserve the playable fallback.

## Phase-00 historical record

The original audit below concerns `48d713e1717b7764b4fa2e59c0c1278866627252`; its initial tree was clean and original game source/art was unchanged in that phase. Its renderer strategy and next action are superseded by the explicit Phase-01 Three.js instruction and the current sections above.

## Completed in Phase 00, with evidence

- Audited tracked tree and core rendering, maps/movement, controller, events, combat, SAN/narrative, saves, UI/accessibility, art/animation/audio pipelines, tests and CI/deployment. Verified findings and limitations: [BASELINE_AUDIT](BASELINE_AUDIT.md).
- Created [creative vision](CREATIVE_VISION.md), [art direction](ART_DIRECTION.md), [architecture decisions](TECHNICAL_ARCHITECTURE.md), [A–G quality gates](QUALITY_GATES.md) and [production roadmap](PRODUCTION_ROADMAP.md). Root `AGENTS.md` carries concise engineering/design/validation rules. Canonical backstory remains in `docs/design.md`.
- Installed lockfile dependencies and required Playwright headless Chromium. Typecheck, event validation (83 events/7 pools), build/asset checks (34.0/45 MiB), **53 original unit tests**, **10 original browser tests** and security audit passed. Five new frozen-save cases bring unit total to **58**. Sandbox-only failures are retained and distinguished from code failures.
- Ran existing combat/load benchmarks. Warm combat p95 0.5 ms desktop / 1.1 ms mobile-4×; these are Canvas-call proxies, not handset/frame/input certification.
- Implemented `utils/capture-baseline.mjs` / `npm run baseline:capture`: production-build screenshots, fixed fixtures/settings, source hashes, console/network failures, cold CDP transfer, real idle RAF samples, heap and WebGL2 probe. Six requested scenes plus party crop, viewport/full-page variants, directly inspected. [Evidence](evidence/2026-11-09/README.md).
- Implemented `utils/compare-baseline.mjs`. Two runs matched **13/13 PNGs, zero changed pixels** with the same browser/host. No claim of cross-machine pixel equivalence.
- Preserved five immutable [v1 save fixtures](../../tests/fixtures/saves/v1/README.md) and added continuation/round-trip/RNG regression tests. Generator refuses overwrites and is outside normal tests.
- Inventoried **83 media files**, including **45 distributed files without file-specific clearance**. Added [provenance ledger](ASSET_PROVENANCE.json) and `assets:provenance`; inventory passes, `-- --release` fails deliberately until clearance is documented.
- Extended CI to retain production baseline diagnostics and check provenance inventory. Existing typecheck, build, events, unit, browser, accessibility, security and asset budgets remain. Routine artifacts are ignored; reviewed baseline is retained under docs.

## Phase-00 gate state (historical)

| Area | Current state | Needed before approval |
| --- | --- | --- |
| Technical | Existing baseline checks pass; known renderer/RNG/door/fog/parser risks documented | Passive renderer compatibility, authored-route/interaction/migration tests, production debug gating |
| Visual | Baseline inspected; S1 title overlap, below-fold desktop actions, generic corridor and mixed sprite styles remain | Native-scale/motion/grayscale review of the built slice; no current art sign-off |
| Gameplay | Existing rules/campaign simulations pass; new slice only specified | Complete playable loop and five moderated first-time sessions |
| Performance | Existing asset/Canvas proxy ceilings pass; local WebGL2 works through **software SwiftShader** | Movement/input/network traces, physical device, peak/process memory and leak evidence |
| Accessibility | Existing tested-screen axe, touch, focus and 200% text checks pass | New mechanisms/HUD plus manual reader and alternative-settings slice review |
| Content | Four protagonists/five-depth campaign/endings exist; no authored Intake Bell implemented | All defined slice beats and meaningful persistent companion response |
| Provenance | Full inventory, no file-specific legacy media clearance | Resolve or replace 45 distributed files; review code-authored art/third-party notices. **No new public release clearance** |

Phase 00's audit/contract/evidence deliverables are complete. This statement does **not** mark the vertical slice, final creative quality, manual accessibility, physical performance, listening review or distribution clearance complete. No deployment or push was performed. Remote GitHub settings/issues/CI and hosted state were not inspected. The new CI steps were reviewed locally; a hosted CI run has not been observed.

## Phase-00 handoff (implemented in Phase 01)

Begin Phase 01 by implementing `src/game/exploration/authored/depth1-intake.ts` and `tests/intake-layout.test.ts` from [the slice blockout](PRODUCTION_ROADMAP.md#spatial-blockout-specification): A→Q→J→breaker→shutter→evidence→counter with optional linen recess, explicit feature IDs and no random hazard on the authored route. Add the map-selection seam for **new runs only**, then the minimal controller interaction/door persistence needed to play the loop. Prove state-aware reachability and v1 save/map preservation before art production or renderer changes. Fix title import overlap in a separate focused UI patch with a viewport regression.

## Session handoff protocol

Check Git status and preserve unrelated edits. Read the relevant contract, inspect current behavior, implement one evidence-backed increment, and update this log with changed files, commands/results, reviewed captures and still-open gates. Never replace historical fixtures/goldens simply to conceal a regression. If a metric or sign-off was not measured, say so.
