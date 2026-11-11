# Phase 02 validation record

Implemented 2026-11-10; final verification resumed 2026-11-11. Initial tree clean on `main` at `96a2d0aae7c3384379885624d6df687275e5db5f` (matches supplied reference). Prepared for a local development commit at the owner's subsequent request. No push, deployment or historical fixture regeneration. Runtime/evidence hashes identify the tested pre-commit candidate.

## Scope and environment

Existing TypeScript/Vite application, Three.js 0.187.0, pinned lockfile Playwright Chromium, fixed seed130013 and DPR 1. Archive captures use desktop1280×900/mobile390×844; inherited Phase 01 tools retain their documented dimensions. Hardware requests use full Chromium with `DUNGEON_BROWSER_CHANNEL=chromium DUNGEON_ENABLE_GPU=1`; reports must identify actual GPU. Mobile viewport and CPU throttling are emulation, not a physical phone.

## Commands and results

| Command | Exit / observed result |
| --- | --- |
| `npm ci` | 0; 59 packages installed, audit0 vulnerabilities; existing esbuild postinstall allowScripts notice retained |
| `npm run typecheck` | 0, strict TypeScript |
| `npm test` | Final permission-enabled pass 0: 115 tests / 23 files, 83 events / 7 pools. Earlier Linux-sandbox pass failed only two spawned-validator stderr assertions; unchanged rerun with required permissions passed |
| `npm run validate:archive` | 0;1,000 fixed Archive seeds,1,000 distinct outputs,zero invalid results; 9 suite cases |
| `npm run assets:provenance` | 0;122inventoried,41distributed unverified,zero inventory failures |
| `npm run audit:security` | 0;zero known vulnerabilities |
| `npm run build` | 0; 35.5 / 45 MiB, all body/hand atlas recomputation checks; existing >500 kB lazy-chunk warning retained |
| `DUNGEON_BROWSER_CHANNEL=chromium DUNGEON_ENABLE_GPU=1 RECORD_ARCHIVE=1 npm run test:smoke` | 0; 25 browser cases, including the full normal journey and title-poll regression |
| `npm run baseline:capture` | 0; 6 frozen-save scenes, zero reported failures |
| `npm run capture:golden` | 0; 10 Intake scenes, zero errors/failures |
| `npm run capture:characters` | 0; 28 reference-pair cases, zero errors/failures |
| `npm run capture:presence` | 0; 60 cast/presence cases, zero errors/failures |
| `npm run capture:archive` | 0; 82 desktop/mobile cases, zero errors/failures; 78 WebGL2, 2 labeled Canvas fallbacks, 2 existing Canvas combat fixtures |

Capture commands use the hardware environment above and separate output directories listed in the retained command ledger. Full commands, timestamps and exit codes are retained in `artifacts/phase02/remaining-command-results.json` and copied into the evidence bundle. Performance and focused integration results are recorded below; missing measurements are not passes. The full sixteen-part delivery report is [retained with the evidence](evidence/phase02/README.md).

The initial full browser run failed 1/24: an old 250 ms title-loading timer could rerender exploration and rewrite only the save timestamp after its shell had been replaced. A temporary save-write stack trace identified the source. The focused title-shell callback guard fixes it; the original raw-save assertion remains, and a delayed-load regression was added. The focused 4-case run and final 25-case suite pass. Neither the test assertion nor its timeout was weakened.

## What the seed suite establishes

Normal units cover 100 fixed seeds; extended suite covers 1,000. Each is generated twice; metadata version, mandatory story placement, complete traversable connectivity with the solvable latch, unsealed main exit, no evidence-latch bypass, available index dependency, no duplicate IDs, room overlap or feature conflicts are checked. Generation leaves gameplay RNG unchanged. Cosmetic salt and generation order tests are independent. Deliberately invalid worlds fail validation. Per-seed save/reload retains an unlocked door, consumed cache and completed event state. Source files and command logs remain reviewable; this does not validate Depths 3–5 or establish player enjoyment.

Legacy tests preserve the immutable v1 maps and next actions/RNG. Additional partial legacy-v1 and pre-Phase 02-v2 saves enter an ungenerated Depth 2 through the unchanged old generator and exact saved RNG stream. New runs use saved policy-v1 Archive; cached/re-entered maps are reused. Full/partial cabinet collection, once-only rewards, mandatory event IDs and fallen-companion inspection are tested.

## Real browser journey and presence

The full-motion, no-QA-hook journey used the normal Begin button and seed entropy, earned supplies and real inventory preparation, completed Intake and guardian1, entered Archive, resolved both existing required events, collected the finite secret reward, saved/reloaded, defeated guardian2, visited Depth 3, returned by the real stair and reloaded again. It records 46 combat actions over three fights, all four protagonists alive and zero browser errors. [Journey/video/state evidence](evidence/phase02/README.md#8-gameplay-and-narrative-proof). This is map-aware automation, not an uncoached play session.

All four living viewpoints, full/reduced motion, desktop/mobile, real accepted interaction, combat, reload and labeled Canvas fallback are covered by the retained browser/capture matrix. Ten additional Intake→Archive shell round trips retain exactly one world renderer and one PresenceView, with no static rebuild on movement. At 200% text, Archive has no horizontal overflow at 1280/390/320 px. Frozen/active and second-tab activation preserve the raw save. The browser never reported `document.hidden=true`; true hidden-tab return is explicitly unverified.

## Performance and resource scope

Actual GPU: ANGLE/Mesa Intel Iris Xe (TGL GT2), OpenGL4.6/WebGL2; i7-1165G7; Chromium158.0.8127.18, Node24.13.0/npm11.19.1, Linux7.1.5+kali-amd64. Full Chromium uses `--enable-gpu`. Both serial benchmark routes use full motion, five-second warmup and60-second measurement, DPR 1. Mobile4× is CPU/viewport emulation.

| Route / viewport | Median / p95 frame | CPU submission p95 | Result |
| --- | --- | --- | --- |
| Intake1280×800 |16.7 /16.7 ms|1.3 ms|Pass existing20 ms threshold |
| Intake390×844, CPU 4× |16.7 /16.8 ms|2.1 ms|Pass existing40 ms threshold |
| Archive1280×900 |16.7 /16.8 ms|1.1 ms|Pass existing20 ms threshold |
| Archive390×844, CPU 4× |16.7 /16.7 ms|2.0 ms|Pass existing40 ms threshold |

Compared with the retained Phase01B report on the same Iris Xe/browser profile, Intake p95 changes from16.7/16.7ms to16.7/16.8ms (desktop/mobile4×); CPU submission changes1.4/2.0→1.3/2.1ms. The0.1ms mobile increase remains within the unchanged budget. Archive's desktop viewport is900px high rather than the inherited Intake800px profile; its result is a separate environment measurement, not a pixel-identical before/after comparison.

Zero long tasks were recorded. Archive captures reach76 draw calls; benchmark final-view calls15/16 are not route maxima. Warm Archive route:8 geometries,26resident textures,8,519,680estimated decoded texture bytes. Fixture-to-ready time289.2/498.0 ms includes UI/assets/first render; isolated geometry construction is not measured. Fresh-context non-audio transfers are1,047,492 bytes for Archive and1,532,011for Intake, without controlled-network throttling. Commit-to-first-submitted-camera-frame p95=16.9/17.6 ms, excluding OS input/queued waiting. Canvas combat proxy (80 warm samples) p95=.5/1.0 ms. All benchmark commands exit0 and the actual metrics pass their unchanged applicable budgets.

Ten forced-GC shell round trips retain stable view/resource counts. Heap grows5,288,676→6,657,192 bytes; the final five samples span6,550,248–6,687,348. This is short warmup/plateau evidence, not proof of bounded long-session process/GPU memory or physical-phone performance. Exact [performance/resource reports](evidence/phase02/README.md#13-gpu-and-resource-measurements) retain scope and source hashes.

## Visual review and evidence integrity

Final Archive:82 cases/164PNGs, two connected-room recordings (45 input steps each), normal full-journey video, room ledger, map SVG/PNG, progression graph,1,000-seed results, browser logs and source/build hashes. Direct review includes all ten room crops, native signature rooms, four protagonist pairs, grayscale, legacy comparison and consecutive motion frames. The near-black initial entry is retained as rejected; Archive practical/fill and doorway/case/lintel corrections followed it. Quiet-room materials/value hierarchy, gallery focal composition and decorative drum-label occlusion remain art-production work. No premium or human approval is inferred from passing pixels.

The installed skill pixel inspector passes two hardware views (desktop drum/mobile aisle): entropy3.88/3.80, contrast168.7/63.0, edge density.226/.261. Its direct CLI cannot bootstrap a DOM-only title. The existing project real-scene adapter now accepts optional manifest/URL, preserving its default Phase 01B behavior and the unmodified inspector checks. Failed direct bootstrap/probe-context attempts are retained separately from passing reports.

`node utils/seal-archive-evidence.mjs` verifies current application/build hashes, all five immutable fixture hashes, the unchanged original generator and complete command/capture results before retaining 223 raw evidence files. Source SHA256=`27678666628c6eaf4ef09060748a3e058d2728c0f8130fca067caa326752b075`; build-manifest SHA256=`ad5e9d96a92c8bccf3a59446d9d00eab9cf0059ea3aaf523009988996716c10b`. [Manifest](evidence/phase02/manifest.json). Documentation is outside the compiled application hash.

## Gates that automation cannot close

Human artistic approval of Phase 01A/01B and the Archive remains open. Physical-phone, long-session process/GPU memory, true input-to-photon, manual screen reader/listening and five uncoached player sessions are not performed here. All ten room roles currently appear in every run; optional-room omission and a wider graph grammar remain future controlled variety. Existing enemy artwork/combat backgrounds and 41 distributed legacy media rights records remain outside this environment pass. No premium/showcase/fun or public-release certification is inferred.

The final registry audit also required an unchanged permission-enabled rerun after a sandbox DNS EAI_AGAIN failure. The retained final audit reports zero known vulnerabilities; the failed network attempt is separate evidence.
