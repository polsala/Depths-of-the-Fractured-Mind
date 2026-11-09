# Phase-01 delivery evidence

This is a working Three.js/RPG integration and playable Intake Bell sequence. **Golden-room artistic approval and public-release clearance are not claimed.** [Implementation boundaries](../../PHASE01_ENGINE.md), [A–G gates](../../QUALITY_GATES.md) and [next action](../../PROGRESS.md#exact-next-implementation-action) distinguish the verified implementation from remaining production work.

The starting commit is `13d159bde01ab3b988edef6d8b58250b0d40d680`. Captures were produced before the user-requested Phase-01 development commit; their Git HEAD records therefore identify that parent. `source-manifest.json` records the delivery source, lockfile, validation tools and built-output hashes; individual capture/performance reports identify their own source revision. The original [Phase-00 evidence](../2026-11-09/README.md) and immutable v1 save corpus were not regenerated. This bundle depicts legacy media with unresolved provenance and is development evidence, not cleared marketing material.

## Environment and repeatability

Linux `7.1.5+kali-amd64`, Node `v24.13.0`, npm `11.19.1`, i7-1165G7 @ 2.80 GHz (8 logical CPUs), 31,818 MiB host RAM. Playwright's lockfile-matched Chromium is **158.0.8127.18**, build 1254. Host RAM is not a measured game/process memory cost.

Required captures use seed **130013**, desktop **1280×800**, mobile **390×844**, DPR **1**, en-US, UTC, dark scheme, muted audio, reduced motion and paused presentation. They are real `data-renderer=webgl2` frames, never fallback frames. `golden/report.json` records GPU, asset URLs/errors, renderer counts, transfer, pixel metrics, settings and source hashes. The frozen-v1 compatibility capture uses **1280×900 / 390×844** and its original fixtures; `legacy/report.json` retains that separate experiment. The supplemental inspector uses its own desktop/mobile preset and records it independently; it does not replace the required DPR-1 images.

## Images and motion

| Scene | Desktop | Mobile |
| --- | --- | --- |
| Admissions / opening | [1280×800](golden/1280-opening-room.png) | [390×844](golden/390-opening-room.png) |
| Queue corridor / release bend | [desktop](golden/1280-corridor.png) | [mobile](golden/390-corridor.png) |
| Shutter / occlusion | [desktop](golden/1280-door-occlusion.png) | [mobile](golden/390-door-occlusion.png) |
| Counting-station interaction | [desktop](golden/1280-interaction.png) | Opening/action control above |
| Keeper | [desktop](golden/1280-npc.png) | [mobile](golden/390-npc.png) |
| Evidence bay / worker | [desktop](golden/1280-evidence-bay.png) | Not part of the declared mobile still set |

Each image also has a `-world.png` native viewport crop beside it. All ten views were directly inspected, including the mobile controls and grounded Keeper. The correction loop fixed a multiline material identifier that generated invalid GLSL, a ceiling hotspot, the too-close counter approach, Keeper grounding/fill, touch-button overflow at 200%, duplicate portrait clutter, the absent worker, the generic bend, the stale power sign, the returning-room loading state and rail sections crossing legal grid movement, humanoid cards on travel lines and keyboard movement failing after Inventory returned focus to its opener. Representative rejected views remain as `rejected-return-loading.png`, `rejected-rail-crossing.png` `rejected-focus-trap.txt` and `pre-clearance-report.json`; local earlier passes remain under `artifacts/phase01/`.

[Uncut real-input walkthrough](intake-walkthrough-640.webm) covers Keeper → breaker → shutter → existing first-body choice → guard/rat combat → counter payoff → reload. The 640×400 review copy preserves the complete muted sequence; the 1280×800 original remains in `test-results/` until the next browser run. Motion was checked through sampled frames, camera tests and the retained unpaused capture; this is not human comfort/listening approval. [Combat](intake-combat.png) and [payoff](intake-payoff.png) are from that actual journey. `intake-journey.json` records eight basic player attacks, party state, persistent flags and zero browser errors. It is a completion policy, not proof of informed tactical play or a 3–6-round fight.

The synthetic pixel test places a sprite behind the same closed shutter: [without card](door-occlusion.png) and [with card](sprite-occlusion.png) are byte-identical PNGs. Opening it makes the card visible: [open without card](door-open.png), [open with card](sprite-visible.png). These fixtures test actual depth-buffer occlusion and are explicitly not campaign encounters. Resize is also exercised at 1000×700; reflow screenshots include 320/390/768 widths at 200% text.

The high-SAN perception figure also has a [clear](perception-clear.png) / [visible](perception.png) pixel pair. The corrected alpha cutoff preserves its faint opacity; junction placement and a near-distance fade prevent the camera from passing through a full-height card. The clue stays optional and its text equivalent remains available. This was verified in the real renderer and recorded journey, not inferred from a scene label.

Compare [Phase-00 first room](../2026-11-09/first-room-viewport.png) with [the same v1 fixture after integration](legacy/first-room-viewport.png), or [the new authored opening](golden/1280-opening-room.png). The latter intentionally changes map, composition and viewport; it is an art comparison, not a pixel-equivalence claim. The old/new [title](legacy/title-viewport.png), [combat](legacy/combat-viewport.png), [inventory](legacy/inventory-party-viewport.png), [party](legacy/party.png) and [mobile](legacy/mobile-viewport.png) remain reviewable.

## Automated results

| Check | Result / evidence |
| --- | --- |
| Typecheck + event validator + units | **77/77, 14 files**; 83 events / 7 pools, [log](unit.txt) |
| Production browser smoke | **15/15**, full-motion walkthrough enabled; [log](browser.txt) |
| Build / atlas / distribution | Pass, 34.6 / 45 MiB; Vite's >500 kB warning retained. Lazy renderer about 593 kB minified / 153 kB gzip |
| Required new-room capture | Ten views / twenty PNGs, zero browser/network/asset errors; [report](golden/report.json), [log](golden-capture.txt) |
| Required frozen-v1 baseline | Six scenes plus party crop, zero failures; [report](legacy/report.json), [log](legacy-capture.txt) |
| Supplemental pixel/budget inspector | Seven declared scene/viewport pairs pass; [reports](inspector/desktop-opening.json), [log](inspector.txt), [coverage check](evidence-check.txt) |
| Security | Zero vulnerabilities; [log](security.txt) |
| Provenance inventory | 83 media files inventoried, 45 distributed unverified; [log](provenance.txt) |
| Release provenance | **Expected failure**, public distribution blocked; [log](rights-release-blocked.txt) |

No test or budget was removed to pass. Portrait tests now open the deliberate disclosure; turn/reload tests wait for the single buffered action to commit; a synthetic Depth-5 fixture removes the Depth-1-only layout identity. Test timing accommodates serial software contexts. `sandbox-unit-failure.txt` preserves the restricted subprocess failure; unchanged validator tests pass with required permissions. Registry audit and browser/server launches also required network/process permissions.

The upstream supplemental inspector waited for a visible canvas on the title before calling a named-state hook. Its initial run therefore failed before reaching the renderer. An ignored local copy changes only that ordering: seed/setState/pause first for named captures, then the same canvas assertion. Pixel/error/GPU/budget/run-ID checks are unchanged. Upstream SHA-256: `a906affed3ad8f1efb5ab3df87f7e673745d59579e2a46b39997f719ff9a97d9`; local adapter SHA-256: `4e28138dca3d5ab34cbd6e6e9f938f344a3ed4b3a220d73bf7869b90e8027a31`. The adapter is `artifacts/phase01/inspect-adapted.mjs`; the portable repository harness is `npm run capture:golden`. Neither inspector coverage nor zero PNG differences confers visual approval.

## Performance and resource interpretation

The hardware movement report uses the production build, a real clock, at least five seconds / 45 frames warmup, then 60 seconds of actual keyboard commands. Routes reach the breaker, evidence, counter and return landmarks. No video or other browser benchmark runs concurrently with accepted timings. Both hardware profiles start at DPR 1, balanced quality. Counts below are sampled views, not a claim of peak GPU/process memory.

| Backend / profile | Median / p95 RAF ms | p95 CPU submission ms | Commit→first frame p95 ms | Disposition |
| --- | ---: | ---: | ---: | --- |
| Intel Iris Xe, desktop 1280×800 | 16.7 / 16.7 | 1.2 | 17.6 | Measured desktop frame budget passes |
| Same Intel GPU, 390×844 / 4× CPU | 16.7 / 16.8 | 5.1 | 33.2 | Emulated frame budget passes; **not a phone** |
| SwiftShader, desktop | 100 / 200 | 1.2 | 240.1 | Software pacing fails; adaptive DPR reaches 0.65 |
| SwiftShader, mobile-4× | 33.4 / 116.7 | 4.8 | 187.1 | Software pacing fails; adaptive DPR reaches 0.65 |

The hardware traces retain occasional hitches: desktop maximum 50 ms (2/3,603 intervals over 20 ms), mobile-4× maximum 116.6 ms (10/3,600 over 20 ms), with one long task in each run. Passing p95 is not a claim that every frame meets the target. `hardware-opening.png` is an earlier GPU-probe view, not a final-room comparison image; use the declared `golden/` set above for the final composition.

[Final-source hardware report](performance-hardware.json), [earlier software comparator](performance.json), [GPU probes](gpu-probe.json) and their text logs retain every sample summary, stalls, long tasks, route coverage, browser/native task totals and resource counts. The headless-shell software profile is an earlier-revision comparator from before the final rail, perception, card-placement and keyboard corrections; it cannot certify final-source software pacing or predict GPU speed. The sandbox hid `/dev/dri`; a probe outside it found the render nodes. Full Chromium's documented `--enable-gpu` option initialized **ANGLE / Mesa Intel Iris Xe (TGL GT2), OpenGL 4.6**. Default full-headless remained SwiftShader; Vulkan was separately probed and is not the accepted timing configuration. No blocklist override was used. See [Playwright's browser distinction](https://playwright.dev/docs/browsers) and [Chromium's GPU guidance](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/using-gpu-hardware-in-headless-chrome.md).

Observed final captures use 18–57 draw calls and roughly 12–16k submitted triangles, with instanced architecture, no post pass and no shadow-map pass. The route uploads five external texture URLs, all for the current depth/global ceiling/Keeper/Subject13; resident texture count after walking is 32, geometry count 7, with about 38.3 MB of owned texture storage estimated from dimensions/mips. That estimate includes generated/cloned textures and is not measured GPU or process RAM. Cold non-audio encoded transfer is **90,756 B at title / 1,351,775 B through Depth 1** in the fixed capture, below the existing 512 KiB / 2 MiB limits.

`renderer-lifecycle.json` records ten GC-controlled frozen-v1 screen cycles: one live renderer, stable 2 geometries / 6 resident textures in that legacy view, JS heap about **5.00→6.19 MB**. It does not prove a long-session plateau or physical-mobile tab survival. GPU timer queries, peak process memory, physical input-to-photon and controlled 10 Mbps / 100 ms network readiness remain unmeasured. Commit timing excludes OS input and buffered waiting; CDP dispatch duration is separately labeled. A benchmark exit code of zero means data capture succeeded, not that every quality gate passes.

## Visual assessment and remaining gates

Calibrated against the installed Three.js skill's scene-1/2/3 anchors. These are Codex's production-review scores, not human sign-off. Genre equivalents: player = party/hero/world-witness presentation; obstacles = guard/rat/door threats; rewards = mechanisms/tag/linen; motion = camera/shutter/echo/combat feedback. Baseline is the preserved Phase-00 active-play set; after is the complete declared room/mobile set, combat and motion evidence.

| Category | Before | After | Evidence / gap |
| --- | ---: | ---: | --- |
| Art direction | 1 | 2.5 | Institutional control now drives geometry, counter, signs, palette and route |
| Hero / witness | 1.5 | 1.5 | Canonical identities preserved; soft Keeper and hero density/edge treatment still clash |
| Enemies / constraints | 1.5 | 1.5 | Threat roles/telegraphs work; vector combat family is not matched to the room |
| Rewards / interactions | 1 | 2.5 | Named counter, breaker, shutter, tag and finite shelf have persistent state |
| World | 1.5 | 2 | Authored foreground/middle/background and meaningful connector; evidence figure remains limited |
| Materials | 1 | 2 | Shared roles, trim, wear/contact and separate surfaces; retained texture density needs normalization |
| Lighting | 1 | 2 | Practical contrast/readable route; Keeper mobile contrast is still weak |
| Motion / feedback | 1 | 2 | Stable camera, shutter/fan/atlas motion, recorded input; no human comfort review |
| UI / HUD | 1 | 2 | World dominates, actions/text/touch reflow; older detail/combat styles remain |
| Performance evidence | 2 | 2.5 | Real hardware/software traces, budgets, input-scope and lifecycle evidence; phone/peak memory open |

After average **2.05/3**; this does **not** meet the skill's premium threshold (all categories ≥2, average ≥2.3). Existing person/enemy placeholders and family mismatch remain an artistic milestone blocker. Inspector metrics support caution: opening entropy about 4.8 desktop / 4.86 mobile, while Keeper views are about 2.65 / 2.62; mobile Keeper contrast is only ~57.3. All inspector render-budget rows pass, which does not improve the art score automatically. Quiet negative space is intentional, but the evidence worker still needs expressive authored treatment and player/art review before being a production reference.

Open blocking work: coherent cleared Keeper/guard reference family; five uncoached player sessions and tactical/pacing/choice interpretation; physical phone and bounded memory; manual reader, muted/effects-off full-route and listening review; code-art originality/contributor review and file-specific clearance/replacement of 45 legacy media files. Later depths retain existing campaign/procedural content, not five newly finished room kits. No hosted CI run, deployment or push was performed. The development commit preserves these open gates.

## Reproduce

```sh
npm ci
npx playwright install chromium-headless-shell
npm test
RECORD_GAMEPLAY=1 npm run test:smoke
npm run assets:provenance
npm run audit:security
npm run capture:golden
npm run baseline:capture
npm run bench:dungeon
npx playwright install --no-shell chromium
DUNGEON_BROWSER_CHANNEL=chromium DUNGEON_ENABLE_GPU=1 DUNGEON_BENCH_OUTPUT=artifacts/phase01/performance-hardware npm run bench:dungeon
npm run bench:combat
npm run bench:load
```

Use appropriate Linux permissions for servers, browsers and GPU devices. Keep captures and benchmarks serial, raw timing clocks real, and old evidence intact. Pixel baselines are browser/backend specific. Exact next implementation: integrate a rights-cleared Keeper/guard reference pair with explicit world scale, foot pivot and animation/facing metadata, then retest it beside a protagonist in the actual room/combat before expanding the kit.
