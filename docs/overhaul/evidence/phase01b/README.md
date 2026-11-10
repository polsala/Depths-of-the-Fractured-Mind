# Phase 01B — main cast and first-person presence

Implemented 2026-11-10 against clean initial HEAD `9509d01df1ca2e61526dc3f338b607538b3bea00`. **Production implementation is reviewable; Phase 01B is not human-art-approved or release-cleared.** No commit existed at evidence capture. The owner's subsequent request authorizes a local development commit; capture reports and `checks.json` retain their pre-commit metadata and exact tested hashes. No push, deployment, Phase 02 generation, story rewrite, combat-rule change or save migration was made.

Review entry points: [six-character native/grayscale family](browser/1280-six-character-family-crop.png), [desktop embodied Intake](browser/1280-elias-idle.png), [mobile Intake](browser/390-miriam-idle.png), [combat action](browser/1280-combat-action-crop.png), [stressed portraits](portraits/1280-stressed-portraits.png), [body motion](motion/1280-hero-motion.webm) and [presence/input motion](browser/390-presence-motion.webm). Per-file hashes are in `evidence-sha256.json`; `source-manifest.json` identifies the pre-commit tested implementation.

Retained `.log` files are readable copies with trailing whitespace normalized for commit hygiene. Their `.log.gz` siblings preserve the exact original tool-output bytes, including rejected runs; both representations are hashed.

## 1. Initial audit

The tree was clean. Phase 01 already supplied Three.js 0.187.0, passive current-map projection, CameraRig, the authored Intake Bell and existing controller/event/combat/save systems. Phase 01A already supplied the Keeper/Guard pair, 16-pose reference atlases and an isolated art lab. The four protagonists still used legacy 512² / 12-slot sheets, repeated/reused clip poses and whole-body HUD thumbnails. There was no first-person body presentation. `docs/design.md` remains canonical; five environments, the four identities, sanity, consequences, relationships and endings are preserved.

The old hero builder rejected rectangular 16-pose input as an unsupported contract. Extending its atlas dimensions, registration and clip timing was necessary; replacing the controller, renderer or save architecture was not. Original hero sources, old reference image, Keeper/Guard art and immutable v1 fixtures remain retained.

## 2. Skills discovered and materially used

[The usage register](../../PHASE01B_SKILL_USAGE.md) records exact installed paths, full bodies/references read, evaluated/executed scripts and affected files. `/skills` was attempted but no slash-command endpoint exists in this runtime. Direct filesystem discovery followed links through repository/parent/home/configured plugin roots; applicable skills were accessible and no relevant disabled skill was found.

The installed `router`, `threejs-game-director`, `create-game-assets`, `generate2dsprite`, `video2dsprite`, `imagegen`, `game-feel`, `game-ui-ux`, `threejs-game-ui-designer`, `threejs-scene-setup` and `threejs-qa-release` shaped the work. The director explicitly requested independent asset/UI work and a concrete-defect review. Sprite Forge doctors and master tooling, raster reports/preview tooling and project-native browser harnesses were actually used; no scaffold or unused engine was introduced.

## 3. Character art decisions

| Protagonist | Retained identity and silhouette | Physical presentation |
| --- | --- | --- |
| Elias Ward | Compact broad slate security uniform, graying temples, guarded warm face, leather half-gloves and service baton | Firm guarded palms and economical reach; a bounded breathing envelope |
| Dr. Miriam Kessler | Narrow bone coat, chestnut bun, burgundy cuffs and precise pale hands | Controlled fingers, clinical support/reach, small motion envelope |
| Subject 13 | Fragile androgynous pallid witness, olive patient clothing, scalp/forearm wraps and visible eye | Bandaged delicate fingers, protective/tension poses; no illness-as-evil redesign |
| Sister Anya Velasquez | Tall deep-teal hood/robe, readable olive face, composed hands and plain prayer cord | Measured open palms and restrained ritual-like support |

All four use the pair's broad upper-left shading, quiet cloth, selective contours and face/hand value separation. Four original masters, four distinct 16-pose sequences and four eight-pose hand sets were generated with the built-in image tool. Raw files, actual prompts, master transforms, source registration and lineage are retained under `source-assets/characters/phase01b/`. These are generated production candidates, not commissioned human final art or a claim of unique/exclusive copyright.

## 4. First-person design

[The presence contract](../../PHASE01B_CHARACTER_PRESENCE.md) defines visibility, context, sanity/injury, reduced motion and anti-patterns. Select a living viewpoint with the existing party portrait buttons. The resolving combat actor retains the body view through its cue, then the current actor is shown. Viewpoint and clocks are session-only.

Hands stay low; injury uses a smaller cell envelope to keep the counter readable. Contextual reach, empty-hand inspection/use, brace, attack/support, hurt and static distress poses are implemented. Idle breathing is under one pixel, step/turn settling is bounded, and the optical camera remains unchanged. Combat reserves a clipped 72-source-pixel band between targets and party vitals. No weapon model, reticle, head bob, blur, chromatic effect or action-game timing was introduced. Context-specific held-object art is a future extension; no prop falsely implies an inventory transaction.

## 5. Animation and contracts

Hero contract v2 is 512×640, 4×4, 128×160 cells, 124 px standing height and `(0.5,0.92)` feet pivots. World heights are Elias 1.78 m, Miriam 1.70 m, Subject 13 1.64 m and Anya 1.83 m. Runtime URLs and legacy animation names remain compatible. Idle/alert/talk, attack, support, brace, hit, strain and four downed key poses are explicit. Directional walk names remain documented frontal-stance aliases; directional locomotion art is not claimed or needed to translate the authoritative first-person grid.

Hand contract is 1024×512, 4×2, 256² cells, stable bottom-center roots and eight distinct poses per character. Both pipelines preserve one source scale per actor, use premultiplied area normalization and binary runtime alpha, and reject empty/duplicate/clipped/stale outputs. Build manifests retain per-frame/source/output hashes.

Attack/support anticipation, contact and recovery share 143 / 403 / 650 ms markers. Enemy/party reactions begin at contact; committed HP, turn order and accessible logs remain immediate. Defend uses the authored brace pose in both body and hands. Reduced motion holds stable action poses and final downed bodies, removing hand offsets and breathing.

There is no configured image-to-video route. Limited-key-pose animation is deliberate and implemented, with real browser motion recordings; it is not represented as fluid video-derived animation. Human transition/anatomy/acting acceptance remains open.

## 6. UI and portraits

Stable square head/shoulder crops replace walking whole-body portraits. Normal uses frame 0, wounded frame 10 and stressed frame 11; fallen portraits retain recognizable neutral identity with a named fallen state. All presentation uses the same below-30% HP/SAN thresholds. Portrait buttons retain keyboard focus after refresh, disable fallen viewpoints and expose pressed state. The extra selector row was rejected after mobile measurement; the existing party strip now owns viewpoint selection.

Dialogue uses canonical speaker portraits and the new Keeper reference image instead of the legacy vendor/radio description. Combat keeps its existing tactical bodies, targets and DOM controls. Party vitals' old neon green/magenta fills were corrected to muted rust/blue/plum; white labels measure 6.48–8.03:1 against those authored solid fills. This is a scoped measurement, not whole-screen contrast certification. DOM HP/SAN/status descriptions, touch targets, native focus, text scaling and muted equivalents remain.

## 7. Engineering boundary

`PresenceDirector` owns frozen copied scalars and presentation time, with no controller, RNG, map, reward, inventory or save callback. `PresenceView` owns one cancellable RAF and an input-pass-through layer over either backend. Both new pipelines extend the existing assets; WorldSpriteSystem reads rectangular hero UVs and exposes isolated hero review cards. No party followers, collisions or encounters were added. Mode/depth/quality replacement disposes presentation; loading, dialogs, settings and non-play modes conceal hands. Tests cover stale dead-actor cues, selected-character fallback, mode boundaries, timing, reduced motion, fixture isolation and lifecycle.

The default Playwright profile remains pinned headless Chromium. Optional `DUNGEON_BROWSER_CHANNEL=chromium DUNGEON_ENABLE_GPU=1` selects the same full hardware Chromium profile as captures/benchmarks without changing assertions or timeouts. Software and hardware outcomes are recorded separately; hardware selection is not physical-phone certification.

## 8. Provenance

Inventory passes **122 media files / 41 distributed unverified / zero inventory failures**. The 33 reviewed Phase 01B files comprise 29 added media and four replaced runtime hero derivatives. Each new chain has retained original-input references, prompts, hashes, provider output terms and reproducible transforms. Complete predecessor records remain under `supersededRecords`; legacy sources and the old comparison image were not cleared.

Raw PNG `caBX` C2PA/JUMBF containers are retained byte-for-byte and hashed; no signature/certificate validation or backend model-version inference is claimed. Runtime normalization strips embedded metadata but links back to retained originals. [Source/terms record](../../../../source-assets/characters/phase01b/PROVENANCE.md) documents the limited provider-use basis and its limits. Backend version, seed and billed cost were not exposed. `assets:provenance -- --release` deliberately remains blocked by 41 legacy distributed files.

## 9. Validation and measured results

Final command results, profile flags and logs are retained in `validation/` and `checks.json`. Source/build/asset/evidence hashes are retained separately. No existing assertion, immutable fixture, coverage floor, timeout or build ceiling was weakened.

| Check | Result |
| --- | --- |
| Typecheck, 83 events / 7 pools, units | 97 / 97 across 20 files pass |
| Build + all three atlas recomputation checks | Pass; 35.5 / 45 MiB; existing >500 kB lazy chunk warning retained |
| Browser suite | 21 / 21 pass in 58.4 s, explicit pinned hardware Chromium profile; prior complete software pass and later interruptions retained separately |
| Asset provenance | 122 inventoried; 41 distributed unverified; zero failures |
| Security audit | Zero known vulnerabilities in audited lockfile |
| Frozen-save baseline | Six frozen-v1 scenes; zero failures; original corpus unchanged |
| Dungeon hardware benchmark | Intel Iris Xe, 60 s each: median/p95 16.7/16.7 ms desktop and mobile-4×; 39 calls; zero long tasks; commit-to-frame p95 15.6/17.4 ms (not physical input-to-photon) |
| Warm combat Canvas proxy | 80 warm samples/profile; p95 0.4 ms desktop / 1.2 ms mobile-4× (Canvas-call proxy) |
| Skill canvas inspector / evidence manifest | Both declared views pass on hardware WebGL2; advisory budgets pass; evidence checker confirms 6 declared artifacts |

Physical phone, long-session/process/GPU memory, true input-to-photon, manual reader/listening and uncoached playtesting remain unmeasured here. Rendering completion and automated route success do not establish immersion or fun.

## 10. Browser evidence and direct inspection

`browser/` retains the 60-case desktop 1280×900 / mobile 390×844 capture set, DPR 1, seed 130013, source/build/runtime hashes, errors and actual WebGL2/GPU diagnostics. Cases cover all four idle viewpoints, injury/tension, real-input inspection, combat action, four support hand fixtures, reduced motion, grayscale, six-character native gallery and each hero's world/combat/pose sequence. Actual actions and isolated art/scalar fixtures are labeled separately.

The body-motion report predates only the later Party vitals fill-color correction; `reuse-record.json` verifies that this unused module is its sole source delta. All body atlases, selectors, world/combat renderers and acting are identical.

`portraits/` retains six derived-save UI fixtures (normal/wounded/stressed × desktop/mobile), all four portraits plus matching HUD/body state. These are explicit browser-only QA values loaded through Continue, not claimed player damage. `motion/` retains 80 world/combat samples and two full hero videos; `browser/` contains two presence/input recordings. `baseline/`, `performance/` and `inspector/` hold their scoped reports. A screenshot is evidence, not automatic artistic approval.

Direct inspection compared the six-character native/grayscale family; all four atlas/hand families; world placement; combat and mobile framing; normal/wounded/strained portrait crops; reduced-motion and hurt poses; and sampled unpaused recordings. No major cell clipping or grounded idle drift remains in the reviewed candidates. Limited pose transitions, identity/anatomy and the whole game's premium quality still need human review. Existing neon/vector enemies beyond Guard remain outside this cast-only replacement and keep global visual acceptance open.

## 11. Rejected passes, failures and open gates

| Observation | Disposition |
| --- | --- |
| Old hero builder rejected v2 rectangular input | Extended and strengthened the existing contract/builder; retained historical sources |
| Initial Elias fallen pose touched cell edge | Rejected; one shared horizontal registration correction applied to every Elias pose, retaining scale |
| Anya hand roots left a one-pixel gap | Shared first-row source root correction; no per-pose fitting |
| Generic raw hand spill QC failed | Intentional bottom-cropped adjacent forearms violate a full-body checker. Exact fail/warn values retained in source README; overlay-specific bounds/alpha/registration checks pass. Generic checker unchanged |
| Installed video route unavailable | Capability evidence retained; implemented honest generated key poses; no fake video clip generation |
| Ambiguous selector label, mobile controls below fold | Explicit name first corrected; selector row then replaced with existing portrait buttons and spacing corrected |
| Hand reached over combat intent / high hurt wrist | Dedicated combat band and smaller exploration hurt envelope; recaptured |
| Stressed portrait pointed at alert frame | Corrected to authored frame 11 after native-scale review |
| WCAG label-content mismatch | Removed overriding name and used native text with a concealed action instruction; existing WCAG assertions pass |
| Portrait capture modified storage before pagehide | QA setup error: live autosave replaced the injected fixture. Return to title before injection; all six corrected fixtures pass. No game save logic changed |
| Sandbox server/DNS/event subprocess failures | Required-permission reruns; no test changes to hide them |
| Parallel capture port collision and browser timeout | Failed/interrupted runs retained under ignored artifacts; overlapping sessions stopped. Hardware and software results kept separate; no timeout raised |
| Installed inspector expected a canvas before named-state setup | Initial DOM-only title timed out. A QA adapter uses its exported, unmodified `inspectPage`, opening the real named QA state after navigation before its canvas wait; no placeholder canvas or fabricated acknowledgment |
| Later serial process ended with signal 143 | Retained as infrastructure interruption, not a passing run; final explicit hardware-profile suite recorded separately |

Open gates: owner/art-director acceptance of the six-person family, hand anatomy/acting and native-scale transitions; continuous/directional motion art if later required; physical-device and human accessibility/listening/play sessions; bounded long-session memory/network certification; hosted CI observation; the 41 legacy distributed media rights records. The installed inspector measures desktop/mobile color entropy 4.91/5.04 bits, edge density 0.312/0.326 and luminance contrast 101.2/110.1; these are advisory image metrics, not taste scores. The applicable premium scorecard was reviewed, but no global premium/showcase certification is asserted while legacy enemy/UI surfaces and human acceptance remain open.

## 12. Exact next production milestone

Review this bundle with the owner/art director: accept or reject each protagonist's identity/silhouette, the six-character native/grayscale family, normal/wounded/strained portrait crops, hand framing and the four motion recordings. Record concrete repaint/timing corrections and human artistic acceptance. Then complete the existing physical-phone and moderated first-time Intake Bell sessions before Phase 02 world-generation/environment expansion. No Phase 02 content production or public release is authorized by this implementation report.
