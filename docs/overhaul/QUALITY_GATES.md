# Quality gates — evidence is the contract

## Phase 02 acceptance addendum — 2026-11-10

The owner authorizes a reviewable graph-first Archive implementation, preserving historical 01A/01B human gates. Read [world architecture](PHASE02_WORLD_GENERATION.md), [Archive design](PHASE02_ARCHIVE_DESIGN.md) and [validation](PHASE02_VALIDATION.md). New gates: explicit saved legacy/new-run generation policy; unchanged immutable-v1 continuation including ungenerated future depths;100fast/1,000extended Archive seeds with hard rejection; gate-aware required reachability; isolated layout/features/decoration RNG; immutable semantic renderer projection; bounded static kit/light/resource ownership; no NPC identity substitution; real Begin→Intake→guardian→Archive journey; all four existing presence identities, accepted interactions, reduced motion/fallback/reload/transition/lifecycle; direct native/grayscale/motion review. Existing budgets and checks remain unchanged.

Current automated results are recorded only in the linked reports. Human Archive composition, landmark recognition, navigation/pacing and character/hand acceptance remain **awaiting sign-off**. Physical phone, manual reader/listening, uncoached player evidence and legacy rights remain open. Archive seed validation does not certify other depths. No public release or artistic approval is granted by this addendum.

Phase 02 final automated disposition (2026-11-11):115 units/25 browser cases;1,000Archive seeds;35.5/45 MiB;82Archive cases plus inherited captures; actual Iris Xe Archive p95=16.8/16.7 ms desktop/mobile 4×. [Retained report](evidence/phase02/README.md) identifies every pass, rejected result and scope. A's tested flows pass; B remains **S1/open** for material/composition polish and human approval; C human play/pacing is unmeasured; D short hardware thresholds pass with physical/long-session/input-to-photon open; E automation/reflow passes with manual/true-hidden-tab/physical review open; F Archive beat types work but human content/remaining depth production is open; G inventory passes with41unverified distributed records, so public release remains blocked. No prior gate is waived.

## Phase 01B acceptance addendum

The cast/presence milestone precedes Phase 02. Preserve all A–G requirements below. Additionally require: four distinct identities across world/combat/portraits/hands; fixed frame bounds/pivots and deliberate clip holds; accepted-action-only gestures; matching combat anticipation/contact/recovery; passive scalar projection with unchanged RNG/saves; stable reduced-motion poses; loading/modal concealment; one disposed presentation loop per shell; unobstructed interactions/targets/HUD at desktop/mobile/200% text. Captures must identify actual WebGL2/GPU, seed/browser/DPR, source/runtime/build hashes and isolated fixtures versus real-input actions. Compare the six-character family and grayscale at game scale. Continuous generated animation cannot be claimed when only key poses exist. Human art/motion approval, physical device, reader/listening/playtest and rights remain explicit gates; [Phase-01B evidence](evidence/phase01b/README.md) records the final disposition.

Phase-01B disposition (2026-11-10): A automated checks pass on the tested flows, including 97 units and 21 hardware-profile browser cases; B has implemented cast/hand/portrait candidates and native/grayscale/motion evidence, with **human family/anatomy/acting acceptance open**; C's existing uncoached fun/tactical/pacing gates remain open; D's measured Intel Iris Xe desktop/emulated 60-second routes pass at 16.7 ms p95 in both profiles, with physical-device/long-session/input-to-photon gates open; E's existing automated focus/reflow/WCAG/reduced-motion checks pass, with manual reader/physical touch gates open; F preserves canonical identities and existing content, with narrative/audio/human approval open; G inventories 122 files with 41 legacy distributed files still unverified, so public distribution remains blocked. Build remains 35.5 / 45 MiB. This does not supersede the exact evidence/limits in the final report or mark the historical whole-game gates complete.

Status as of 2026-11-09: Phase-01 integrated Three.js/intake implementation has automated evidence; artistic, human-play, physical-device and distribution approvals remain open. See [Phase-01 evidence](evidence/phase01/README.md), [historical audit](BASELINE_AUDIT.md) and [progress](PROGRESS.md). Criteria below remain **required target behavior**, not claims that every gate passes.

Phase-01A update, 2026-11-10: the character-only reference pair has **80 passing unit tests and 18 passing browser cases**, generated-frame/alpha/registration checks, a six-character native/grayscale gallery, 28 desktop/mobile captures and two recorded motion clips. [Character standard](CHARACTER_ART_STANDARD.md) and [approval package](evidence/phase01-art-approval/README.md) retain the corrections and final measurements. This is evidence for review, **not independent human artistic approval**. B3/B6 and the broader legacy distribution gates remain open; none of the acceptance criteria below was weakened.

The new pair's original-input generation chains and checked provider output terms document project-use/distribution rights; no exclusive copyright or uniqueness claim is made. Backend model ID was not exposed and remains a traceability limitation. Inventory is now **93 media files / 45 distributed unverified**, all retained from the legacy set. Public release remains blocked. Existing hero files, event/rule source and immutable v1 fixtures are unchanged.

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

The Phase-00 ledger inventoried 83 image/audio/vector files, including 45 copied from `public/` into distributions without file-specific clearance evidence. Phase 01A adds ten documented new source/runtime files; those original-input assets have a retained provider-use basis. The original 45 remain unverified. MIT in the repository is not evidence of upstream art/audio ownership. This is an unresolved legacy release gate, not a finding that infringement occurred. Existing references to issue #57 were read locally; its remote status has not been verified.

## Current gate disposition

Reviewer/date: Codex automated verification and direct image/motion-frame inspection, updated 2026-11-10 for the character pair. This is not an independent human art, device, accessibility or player sign-off. Exact source/build hashes and command results are retained in the linked evidence bundles.

| Area | Phase-01 evidence | Disposition |
| --- | --- | --- |
| A | 80 units, 18 browser cases, retained real-input route, v1 map/RNG comparison, actual sprite occlusion, absent/lost WebGL, lifecycle checks; character alpha/registration/timing/QA-state isolation | Automated coverage passes on tested flows. Hosted CI and exhaustive malformed legacy saves remain unobserved; no general data-integrity certification |
| B | Keeper/Guard reference pair, six-person native/grayscale gallery, 28 desktop/mobile cases, two motion clips and corrected framing/contact; historical room/route evidence retained | **Human artistic acceptance pending (S1):** Keeper identity, pair/hero edge density and acting still need owner review. Other vector enemies, evidence-figure expression and wider surface storytelling remain outside this pair's completion |
| C | Required path/mechanism/reward/flee/death/full-inventory tests and no-cheat browser combat/return; one basic policy wins the seeded fight | **Not measured / open S1:** five uncoached sessions, comparative tactical policies, SAN/branch interpretation and 3–6 round tuning. Automation does not prove fun |
| D | 35.0/45 MiB; title/Depth-1 download checks retained; final-pair Intel Iris Xe 60-second desktop and mobile-4× median/p95 16.7/16.7 ms; separate historical failing SwiftShader report; existing lifecycle tests retained | **Measured hardware desktop/emulated D3 frame component passes; historical software profile fails.** Physical phone, bounded long-session/process/GPU memory, true input-to-photon and controlled-network D4 remain open (S1). No physical-mobile claim |
| E | Existing axe, keyboard focus, touch, 320/390/768 reflow, 200% text and preference checks retained; reduced-motion camera and text interactions tested | Automated tested screens pass; **manual E4–E6 and physical touch review open (S1)** |
| F | Authored intro, counter landmark, purposeful connector, breaker/shutter, Keeper, finite secret, existing event/tactical fight, optional perception and named return payoff implemented | Beat types playable; **slice/campaign content approval open (S1)** for full voice/style/audio and human route review. Later depths retain existing procedural content rather than new golden kits |
| G | 93 media files inventoried; new pair's ten-file original-input chain/provider-use terms retained; all 45 legacy distributed files still unverified; backend image model version not exposed; Three.js MIT notice retained | **Public distribution blocked by legacy assets (S0).** New pair's use basis is documented separately from human artistic approval, exclusivity and unknown backend metadata; no legacy media was silently cleared |
