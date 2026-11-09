# Production progress

Updated: 2026-11-09. Source audited: `48d713e1717b7764b4fa2e59c0c1278866627252`. Initial working tree clean; no original game source/art changed. This file is the starting point for future sessions.

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

## Gate state and unresolved work

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

## Exact next implementation action

Begin Phase 01 by implementing `src/game/exploration/authored/depth1-intake.ts` and `tests/intake-layout.test.ts` from [the slice blockout](PRODUCTION_ROADMAP.md#spatial-blockout-specification): A→Q→J→breaker→shutter→evidence→counter with optional linen recess, explicit feature IDs and no random hazard on the authored route. Add the map-selection seam for **new runs only**, then the minimal controller interaction/door persistence needed to play the loop. Prove state-aware reachability and v1 save/map preservation before art production or renderer changes. Fix title import overlap in a separate focused UI patch with a viewport regression.

## Session handoff protocol

Check Git status and preserve unrelated edits. Read the relevant contract, inspect current behavior, implement one evidence-backed increment, and update this log with changed files, commands/results, reviewed captures and still-open gates. Never replace historical fixtures/goldens simply to conceal a regression. If a metric or sign-off was not measured, say so.
