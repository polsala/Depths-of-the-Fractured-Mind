# Quality gates — evidence is the contract

Status as of 2026-11-09: technical baseline largely passes; artistic, human-play, physical-device and distribution approvals remain open. See [audit](BASELINE_AUDIT.md) and [progress](PROGRESS.md). Criteria below are **required target behavior**, not claims that the current game meets them.

## Severity and decision rule

**S0 — Stop:** crash/data loss/softlock, unsafe or unusable essential interaction, unsupported distribution rights. Blocks the affected build or public release immediately. Local audit of existing uncleared media may continue.

**S1 — Milestone blocker:** fails identity, readability, playability, performance or completeness promised by the slice. Blocks slice approval and expansion to more depths. Known baseline issues stay visible while foundation work continues.

**S2 — Scheduled defect:** a local cosmetic or noncritical issue with a working alternative. Must have a repro, owner and target phase; cannot be silently accepted. Repeated S2 problems that undermine a whole experience become S1.

All A–G areas need an explicit `pass / fail / not measured` entry, reviewer, date, build/source hashes and evidence link. Missing evidence is `not measured`, never a pass. An exception requires a bounded scope, rationale, corrective work and review date; it cannot waive a player's lost save, an essential inaccessible action or missing distribution rights. Do not weaken existing CI or budgets to claim a pass.

## A. Technical correctness

| ID | Observable acceptance | Required evidence | Severity |
| --- | --- | --- | --- |
| A1 | Lockfile install, strict typecheck, event validator, all unit tests, production build and all browser smoke tests exit 0; no skipped regression introduced | Command logs, versions and HEAD/tree hashes; CI result when run remotely | S1; crashes S0 |
| A2 | Seed + saved RNG reproduce map/encounter and next action; rendering does not change game state or random stream | Frozen v1 tests, before/after snapshot/RNG assertions including an actual UI-rendered legacy checkpoint | S0 for lost progression; otherwise S1 |
| A3 | Required path, gate solution, witness, reward and objective remain reachable in correct order; blocked movement has no side effect | State-aware reachability test for authored map; 100 fixed procedural seeds for required routes; no-cheat browser journey | S0 |
| A4 | Save/reload/import/export preserve event, conversation, combat, door/reward state and ending; corrupt/future input leaves prior save intact | Frozen corpus plus v2 migration cases, storage-failure tests and real browser reloads at each beat | S0 |
| A5 | No uncaught exception, console error, failed essential request, 4xx/5xx or HTML served as media in the tested flow | Capture JSON diagnostics and smoke logs; explicit failure-path tests for unavailable event/media data | S0 if play blocked, otherwise S1 |
| A6 | One accepted input resolves one action; doors, pickups, turn order and reward transactions cannot duplicate; mode changes stop queued input | Keyboard/touch stress/repeat, reload-during-transition and atomic reward tests | S0 for exploit/softlock; otherwise S1 |
| A7 | Production subpath loads assets/imports correctly; player build has no visible cheats; release uses the tested build | Built preview + base-path smoke, build digest, release workflow review | S1 |

## B. Visual quality

| ID | Observable acceptance | Required evidence | Severity |
| --- | --- | --- | --- |
| B1 | Wall, floor, ceiling, doors and people share a coherent horizon/scale while stepping and turning; sprites never float, stretch at near walls or show through solid walls | Fixed room/corridor/intersection images, occlusion test scenes and continuous walk video at desktop/mobile | S1 |
| B2 | Every slice room has distinct function, focal point and material hierarchy; return route is recognizable | Room ledger, plan/sightline diagram, art review and landmark identification by ≥4/5 new players | S1 |
| B3 | Party, NPC and enemies share edge/detail/light treatment and read at 48–96 px; all action states preserve identity/pivot | Native-size crops/contact sheets and in-room/combat captures, grayscale and reduced-motion review | S1 |
| B4 | Door/required interaction/threat readable at ordinary display brightness; focus hierarchy survives grayscale and effects off | Normal/grayscale screenshots, muted/effects-off play, reviewer notes on each required cue | S1 |
| B5 | Title, HUD, dialogs and combat controls neither overlap nor clip at supported viewports; essential actions remain visible at 1280×900 and 390×844 default text | Viewport captures **and** bounds/focus checks; full-page captures to reveal overflow | S1 |
| B6 | No generic corridor runs, flat lighting, unmotivated clutter, excessive bloom, muddy sprite read or interchangeable rooms | Explicit pass/fail against [anti-pattern table](ART_DIRECTION.md#explicit-anti-patterns-and-rejection-tests), with rejected examples retained | S1; isolated minor seam S2 |

Visual sign-off requires direct image and motion inspection. PNG difference counts only reveal change. An unchanged known defect still fails.

## C. Gameplay quality

| ID | Observable acceptance | Required evidence | Severity |
| --- | --- | --- | --- |
| C1 | ≥4/5 uncoached first-time players identify their objective in 60 s, recognize the counter landmark on return and finish the 12–18 minute slice without a softlock | Moderated session notes/video, route/time, wrong turns, questions asked and revision record | S1; softlock S0 |
| C2 | At least two practical combat responses exist; threat telegraph supports a deliberate guard/taunt/heal/target choice rather than mandatory attack spam | Seeded tactical vs basic policy report plus ≥4/5 players explaining one informed choice | S1 |
| C3 | Slice combat lasts roughly 3–6 rounds with finite SAN/consumables; no stun-lock or stuck turn, first threat telegraphed and recovery possible | Per-action log, resource changes, 20 seeds/policies; time cap of 250 actions flags a fault | S1; stuck turn S0 |
| C4 | A narrative choice changes a later line/relationship memory or available option; reward and cost are understandable and persist once | Two branch playthroughs, flag/reward diff, save/resume evidence, player interpretation | S1 |
| C5 | Sanity moment conveys uncertainty and optional information without changing required navigation or punishing missed visual effects | High/mid/low SAN, muted and effects-off routes; accessible perception log; recovery path test | S1 |
| C6 | Main path has anticipation, one decision, a threat and a recovery/payoff; no player reports repeated purposeless searching as the dominant activity | Beat timing and observation notes from five sessions; delete or revise recurring weak beats | S1 |

These sample sizes are a minimum formative review, not statistical proof. Automated campaign completion verifies rules; it cannot establish curiosity, dread or enjoyment.

## D. Performance

Reference host/settings must accompany all numbers. Repeat comparative runs serially on the same host/browser/seed, cold transfer and warm rendering separately. Synthetic throttling is not handset certification.

| ID | Observable acceptance | Required evidence | Severity |
| --- | --- | --- | --- |
| D1 | Existing `dist` ceiling remains ≤45 MiB; title non-audio <512 KiB and through Depth 1 <2 MiB | Build asset checker, existing smoke and cold-cache CDP capture | S1 |
| D2 | Warm combat Canvas p95 ≤16.7 ms desktop and ≤33 ms mobile at 4× CPU throttle | Existing `bench:combat`, 80 measured samples after warmup, dimensions/settings recorded | S1 |
| D3 | During a 60 s representative slice walk: p95 frame interval ≤20 ms desktop / ≤40 ms mobile-4×; accepted input visibly acknowledges within 100 ms p95 | RAF/input timing trace and video, long tasks and dropped-frame report; no fake timer clocks | S1 |
| D4 | Cold usable title ≤3 s and first usable slice view ≤5 s on a recorded 10 Mbps / 100 ms RTT profile; heavy assets do not block essential controls | Throttled production trace, cache state, readiness markers | S1 for milestone; targets require measurement |
| D5 | Ten scene/combat/dialog round trips show no unbounded listeners, canvases or retained heaps; mobile tab survives the whole slice | Before/after GC-controlled heap samples plus process/RAM on a physical device | S1 for leak/crash |
| D6 | No required WebGL feature fails silently; current Canvas baseline works regardless of WebGL2 availability | Probe result with renderer/vendor, no-WebGL test if new renderer added, hardware and software profiles separately | S1 |

Sampled JS heap and idle RAF intervals in Phase 00 are diagnostic only. They do not satisfy D3–D5 or measure peak decoded-image/GPU/process memory. Record audio separately because browser range fetch behavior varies.

## E. Accessibility

| ID | Observable acceptance | Required evidence | Severity |
| --- | --- | --- | --- |
| E1 | Existing axe WCAG A/AA scans pass for title, exploration, event and combat; essential information is available as text | Existing browser suite and manual Canvas/DOM parity review | S1; missing essential access S0 |
| E2 | Whole slice operable by keyboard and touch; dialogs trap/restore focus and Escape closes where appropriate; no global movement while typing or selecting | Keyboard-only and touch walkthrough, focus recordings, 44×44 CSS px target check | S1 |
| E3 | Reflow at 320/390/768/1280 widths, 200% text, dark/light OS scheme; no horizontal page overflow or hidden required controls | Existing tests plus mechanism/dialog/party extensions and native viewport screenshots | S1 |
| E4 | Muted audio, effects off and reduced motion retain every essential cue; no compulsory shake/bob, flashing or time pressure | Full alternative-settings slice run; compare cues to normal mode | S1 |
| E5 | Text/UI meets 4.5:1 normal / 3:1 large text contrast, essential graphical controls 3:1; color is supplemented by shape/words | Contrast scan/manual Canvas samples, grayscale comparison, reader review | S1 |
| E6 | A screen reader can identify objective, party state, action/target, mechanism result and consequence with manageable announcements | Named screen reader/version and recorded manual transcript; axe alone is insufficient | S1, currently not measured |

## F. Content completeness

| ID | Observable acceptance | Required evidence | Severity |
| --- | --- | --- | --- |
| F1 | Slice includes intro room, landmark, distinctive connector, operable door, NPC, secret/reward, tactical fight, perception moment, clear objective/payoff | Complete beat checklist with playable route and images/video, no debug skips | S1 |
| F2 | All four protagonists retain names, roles, complicity and at least one meaningful response in the slice | Narrative review against `docs/design.md`, branch transcript | S1 |
| F3 | Expansion includes all five materially distinct depths, required story beats and independently reachable four ordinary/one hidden ending | Content matrix, no-cheat campaign tests and human campaign playthroughs | S1 at campaign milestone |
| F4 | No placeholder art/audio/text presented as final; no unexplained reused NPC identity or unimplemented interaction promise | Asset/content register with approval status, in-game sweep, credits | S1 for release, labeled placeholders allowed in development |
| F5 | Content loader failure cannot softlock required progression; every choice label/requirement matches its actual effect | Event validation, fallback and full-inventory/party-death tests; targeted transcript | S0 for softlock |

## G. Asset provenance and distribution rights

| ID | Observable acceptance | Required evidence | Severity |
| --- | --- | --- | --- |
| G1 | Every shipped media file has named creator/source, explicit terms for intended redistribution, derivative chain and retained evidence | File-level [ledger](ASSET_PROVENANCE.json), hashes, license/contract/author confirmation; `assets:provenance -- --release` | S0 public distribution |
| G2 | Generated media records tool/model/date, inputs/references, permitted use and edits; commissioned media records assignment/license | Retained source records; no inference from filename or visual style | S0 public distribution |
| G3 | Code-authored visuals, fonts, logos and dependency notices are covered; protected designs/assets are not copied | Originality review, repository contributor/license evidence, third-party notices/credits | S0 public distribution |
| G4 | No unverified asset reaches a new public release; replacement art propagates to atlases/backgrounds/reference sheets and build outputs | Production manifest ↔ ledger comparison, release checklist and tested build hash | S0 |

Current ledger inventories 83 image/audio/vector files, including 45 copied from `public/` into distributions. All 45 lack file-specific clearance evidence in the repository audit. MIT in the repository is not evidence of upstream art/audio ownership. This is an explicit unresolved release gate, not a finding that infringement occurred. Existing references to issue #57 were read locally; its remote status has not been verified.

## Current gate disposition

| Area | Phase-00 evidence | Disposition |
| --- | --- | --- |
| A | Build, typecheck, events, 53 original tests, 5 added compatibility tests, 10 browser tests pass; known renderer/RNG and parser risks remain | Baseline captured; target A2/A7 open |
| B | Six scene captures plus party crop inspected; overlap, HUD composition and style mismatch documented | Fail for slice approval |
| C | Existing automated campaign/combat simulations pass; no moderated slice sessions | Not measured for new slice |
| D | Budget and warm combat proxy pass; WebGL2 probe recorded | Partial; movement/network/device/memory gates open |
| E | Existing automated scans/reflow/focus pass on tested screens | Partial; manual reader/new slice review open |
| F | Existing campaign/83 events present; new authored slice specified only | New slice not implemented |
| G | Complete media inventory; 45 distributed files unverified | Public distribution blocked |
