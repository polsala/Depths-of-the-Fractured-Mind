# Phase 01A — Keeper / Guard character review

**Status: human artistic approval pending; legacy distribution clearance blocked.** This is a concrete original-input character reference pair and validation package. It is not an assertion of independent art-direction approval, copyright exclusivity or physical-device certification. [Production standard](../../CHARACTER_ART_STANDARD.md), [quality gates](../../QUALITY_GATES.md), [progress](../../PROGRESS.md), and the [generation/rights record](../../../../source-assets/characters/phase01a/PROVENANCE.md) define the scope.

Base commit: `fbb383c` (Phase 01). Captures precede the user-requested Phase-01A development commit, so their Git HEAD records this parent. `source-manifest.json` identifies tested source, art, contract/build tools and build files; `SHA256SUMS.json` binds the retained evidence. The Phase-00/01 evidence and frozen v1 save fixtures were not overwritten.

## Original defects and decisions

The [old Keeper](before-keeper-desktop.png) reused a tall, gray-green vendor with tiny irregular objects, weak face/cloth/limb separation and a dense dark silhouette. The [old Guard](before-guard-combat-desktop.png) was a tiny neon outlined vector figure beside shaded raster heroes. The before captures were made in the actual application, not reconstructed from source art. The original game had no Keeper combat actor or Guard exploration card; no invented before view is supplied for those.

The new Keeper is a narrow former registrar: pale severe face/white hair, bone sleeves, petrol waistcoat, claim tag and ledger. The Guard is a broad security silhouette: square cap/raised collar, slate uniform, rigid halt palm, baton and a folded admission slip across the mouth. Both use compact human proportions, upper-left shading, purposeful broad forms and quiet institutional material roles. The four protagonist source sheets and atlases are unchanged.

Sixteen different pose drawings per character supply idle, alert, anticipation, strike/follow-through, recovery, damage and defeat. Six attack poses fit the existing 650 ms visual cue. Normalization preserves one scale per character, 128×160 cells, a `(0.5,0.92)` foot pivot and true runtime alpha. Standing heights are 1.72/1.86 m. No whole-body scale bob or code-drawn character substitute is used.

Correction record: a realistic first Keeper concept was rejected; the Guard face was differentiated from its style reference; a [coarse-density comparison](density-comparison.png) lost expression and was rejected; [mobile Guard framing](rejected-guard-framing.png), chair occlusion, one kneeling contact offset and the action laboratory’s mobile aspect/camera framing were corrected. The review fixture's timestamp-dependent state check was corrected to compare serialized maps/flags/party/RNG with a fixed capture timestamp. Pixel checks were optimized without reducing their assertions or raising a test timeout.

## Gallery and actual-game captures

All required stills use pinned Playwright Chromium, seed 130013, DPR 1, desktop **1280×800** and mobile **390×844**, muted audio, en-US/UTC and dark scheme. Main PNGs retain the declared viewport; separate `-full.png` and `-canvas.png` images expose reflow and native rendering. Reports identify the real WebGL2 renderer/vendor; software-rasterized visual checks are not FPS evidence.

| Required view | Desktop | Mobile |
| --- | --- | --- |
| All four protagonists + Keeper + Guard | [six-character gallery](captures/1280-keeper-gallery-idle.png) | [gallery](captures/390-keeper-gallery-idle-full.png) |
| Keeper in exploration, actual application | [Keeper](captures/1280-keeper-exploration-actual.png) | [Keeper](captures/390-keeper-exploration-actual.png) |
| Guard in exploration, actual application | [Guard](captures/1280-guard-exploration-actual.png) | [Guard](captures/390-guard-exploration-actual.png) |
| Keeper in shared combat renderer | [Keeper fixture](captures/1280-keeper-combat-idle.png) | [Keeper fixture](captures/390-keeper-combat-idle.png) |
| Guard in event-entered actual combat | [Guard](captures/1280-guard-combat-actual.png) | [Guard](captures/390-guard-combat-actual.png) |
| Keeper pose sequence, native cells | [all 16 drawings](captures/1280-keeper-sequence-idle-canvas.png) | [sequence](captures/390-keeper-sequence-idle-full.png) |
| Guard pose sequence, native cells | [all 16 drawings](captures/1280-guard-sequence-idle-canvas.png) | [sequence](captures/390-guard-sequence-idle-full.png) |

The six-character gallery normalizes **visible body height** to 124 px, then 64 px and 48 px grayscale. That composition does not rescale/replace the heroes in the game. [Alpha over light/dark](alpha-backgrounds.png) checks edges separately. The report also includes fixed-time world attack poses, combat hit reactions and reduced-motion settled defeats for both characters.

The actual application screenshots use named camera fixtures and the real HUD. Guard combat is entered through the existing first-body choice and interaction. Arbitrary Keeper combat/action/defeat playback is clearly labeled **isolated presentation review**, not a new NPC fight or a new gameplay outcome. The laboratory uses the same `DungeonRenderer`, `renderCombatUI`, atlas samplers and party assets; its state/RNG/save-isolation checks pass.

## Motion and assessment

[Keeper motion](captures/keeper-animation.webm) and [Guard motion](captures/guard-animation.webm) are real browser recordings of idle → alert → anticipation → attack → hit → defeat. They are not GIFs synthesized from source frames or fabricated frames. Sampled-frame sheets support inspection; the clips remain the primary temporal evidence. Limited-key-pose animation is intentional, not a claim of smooth high-frame-rate character animation.

Direct inspection finds clear improvements in face/garment separation, named role, stable scale, ground contact and Guard threat readability. Both figures now use raster shading rather than the Guard's old outlined icon language. Remaining human decisions include whether the Keeper is sufficiently unsettling rather than merely stern, whether the sharper new face/edge treatment belongs beside the softer protagonists, and whether the windup/recovery and loop seams have the desired acting quality. Other enemies, including the rat, retain existing vector placeholders outside this pair's scope. No whole-game premium score is inflated by this pass.

## Validation and measured limits

Executed results are retained with source/build and asset hashes. A missing result is not a pass. Logs retain their content with trailing whitespace normalized for the repository.

- Unit/type/event suite: **80 passing tests / 15 files**, strict TypeScript and 83 events / 7 pools; [log](unit.txt).
- Browser suite: **18 passing cases**, including the original save/gameplay/accessibility coverage and three new art cases; [log](browser.txt). The final review-only Keeper intent-label and mobile action-framing corrections is also followed by [three passing art cases](final-art-browser.txt).
- Production build: **35.0 / 45 MiB**, existing limits retained; Vite's renderer chunk warning remains visible.
- Character check: 32 distinct nonempty poses, exact regenerated outputs, true binary alpha, safe cell edges, declared grid, fixed scale and checked ground tolerance; no filler duplication.
- Art capture: **28 cases / two motion recordings**, zero browser/HTTP/asset errors; [report](captures/report.json), [log](character-capture.txt).
- Provenance inventory: **93 media files / 45 distributed unverified**, with no inventory errors. Release check deliberately fails until clearance.

The [frozen-v1 baseline](legacy/report.json) passes six scenes plus the party crop with zero failures and no horizontal overflow. Its cold non-audio title / legacy Depth-1 checkpoint transfer is **91,987 / 1,348,590 B**; the authored-start download ceiling also remains enforced by the original browser check. This is the same immutable save corpus with new presentation, not a regeneration of old fixtures or historical images.

| Measurement | Desktop | Emulated mobile | Scope |
| --- | ---: | ---: | --- |
| Warm Canvas median / p95 | 0.2 / 0.3 ms | 0.5 / 1.0 ms | 80 draws after warmup; Guard atlas explicitly ready; CPU submission proxy, not frame/device timing |
| Intel Iris Xe RAF median / p95 | 16.7 / 16.7 ms | 16.7 / 16.7 ms | 60-second real-input route after warmup; mobile viewport uses 4× CPU and the same desktop GPU |
| CPU render submission p95 | 1.2 ms | 2.2 ms | Separate from GPU/display time |
| Commit → first submitted frame p95 | 16.0 ms | 18.3 ms | Excludes OS input and queued waiting; not physical input-to-photon |

[Warm combat log](combat-benchmark.txt) and [hardware report](performance-hardware.json) retain measured settings. The Intel run contains **3,601 / 3,624 frame intervals**, reaches all five benchmark waypoints, reports zero long tasks and zero browser errors, and meets the existing 20/40 ms p95 frame ceilings. Maximum intervals are 16.8 / 33.3 ms; p95 does not promise every frame hits the target. Resident samples show 33 textures, 7 geometries and six external viewport URLs for this depth/global/character set. The owned-texture estimate is about 37.2 MB from dimensions/mips, not measured process or GPU RAM. The prior Phase-01 SwiftShader failure remains historical evidence rather than a prediction of hardware performance.

Host: i7-1165G7 / Intel Iris Xe (TGL GT2), ANGLE/Mesa OpenGL 4.6, Linux, Node 24.13.0, pinned Chromium 158.0.8127.18. Reports retain the precise environment. Visual captures use default headless SwiftShader with genuine WebGL2; accepted hardware timing uses full Chromium with `--enable-gpu`, separately. No physical-phone, listening, human playtest, reader or long-session memory sign-off is implied. Character gameplay/rule source, event data, hero media and frozen v1 fixtures are verified unchanged.

## Rights and approval gate

The built-in OpenAI image service produced six retained source images from original text and this pair's own generated references. [Generation record](../../../../source-assets/characters/phase01a/generation-record.json) stores prompt/input/output hashes and invocation output IDs. [Provider-term references](../../../../source-assets/characters/phase01a/terms-support.json) were checked on 2026-11-10. The backend model ID was not exposed; neither exclusivity nor this account's negotiated terms was inferred. The new source/runtime chain has **documented project-use/distribution rights under the retained provider output terms**, based on the original inputs, hashes and inspected outputs. This does not assert exclusive copyright, uniqueness or an uninspected account-specific exception. Backend model-version metadata remains unknown. The existing 45 unverified distributed media files were not silently cleared.

| Approval requirement | Current disposition |
| --- | --- |
| Keeper/Guard at actual game size | Captured, inspected and corrected; human acceptance pending |
| Cohesion with all four protagonists | Six-character native/grayscale comparison supplied; human acceptance pending |
| No muddy silhouettes / major motion defects | Technical checks and self-review supplied; independent art/animation review pending |
| Correct exploration/combat rendering | Tested actual WebGL2, depth occlusion, frame timing/ground registration and real event-entered combat; Keeper combat is a fixture |
| Verified provenance / distribution rights | Original-input chain and checked output terms support project use; backend model version unknown, no exclusivity claim; **legacy rights still block release** |
| Automated regressions | Passing executed results above; no test, budget or gameplay rule was removed |

Exact next action: have the owner/art director review this package at native size and in motion, record accepted/rejected identity/edge-density/acting decisions, and retain the separate provider-use rights record. Apply only the resulting character corrections before accepting this pair as a production reference. Do not begin Phase 02 or expand the five-depth environment kit. The Phase-01A development commit preserves the open human art gates; no push or deployment was performed.

## Reproduce

```sh
npm run characters:build
npm run characters:check
npm test
npm run test:smoke
npm run capture:characters
BASELINE_OUTPUT=artifacts/phase01-art/legacy npm run baseline:capture
npm run bench:combat
DUNGEON_BROWSER_CHANNEL=chromium DUNGEON_ENABLE_GPU=1 DUNGEON_BENCH_OUTPUT=artifacts/phase01-art/performance-hardware npm run bench:dungeon
npm run assets:provenance
```

Use required Linux browser/GPU permissions and keep timing runs serial. Interactive review: `?qa=1&art=1` on the existing Vite/GitHub Pages base path; this route is absent unless both flags are explicit. Generation used the built-in image tool, not an API-key fallback. Review PNGs are not cleared marketing assets.
