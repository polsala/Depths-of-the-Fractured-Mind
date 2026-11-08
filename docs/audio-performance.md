# Audio and asset performance · Pack 08

## Audio contract

The eight existing Ogg music tracks are selected by title, depth and combat state. A change to a different track uses an 800 ms crossfade; rerendering the same state does not restart it. A newer transition cancels the prior fade. Mute persists through the existing preferences store and prevents an initial music fetch. Sound effects use a maximum of three concurrent voices per source. The gameplay layer emits semantic cues for footsteps, hits/misses, casts, defense, items, status changes, narrative choices, boss low-health phase, level-up, victory and defeat; the audio manager maps cues to the seven currently available recordings. The visual combat log, status labels and end screens remain authoritative when muted.

This is a functional cue map, **not final sound design**. Several cues intentionally share a recording until dedicated audio is commissioned. Source/rights evidence for the legacy recordings is not in this repository; #57 is the release gate for that evidence. Do not treat these recordings as cleared for commercial distribution without it.

### Level audit

Measured 2026-11-08 with `ffmpeg -af ebur128=peak=true` (decoded Ogg): music is approximately -11.6 to -14.9 LUFS integrated, with true peaks up to +0.2 dBTP; SFX are -15.4 to -19.6 LUFS, with `hit_light` +1.0 dBTP and `ui_click` +1.5 dBTP. The latter two are attenuated at playback to 65% and 60% respectively, rather than recompressing lossy source files. The other clips are unchanged. This checks individual recording peaks, **not** the final mixed output on a physical phone or desktop. Listen and capture output on both before an audio sign-off; simultaneous voices may still need a bus limiter or remastering from lossless masters.

## Asset pipeline and budgets

The source PNG art is preserved in `source-assets/`; only the currently rendered backgrounds, wall/floor textures and prop images are converted to WebP under `public/`. The source character sheets remain there too; `npm run sprites:build` derives the four atlases. `npm run assets:build` deterministically regenerates the WebP files (`cwebp` and `ffmpeg` required for that authoring command). CI consumes committed outputs, so it does not require those tools. Canvas props request their image only when visible rather than when the title module is loaded.

`npm run build` checks WebP signatures/presence in both `public` and `dist`, detects leaked PNG source art, and fails if the distribution exceeds **45 MiB**. A browser smoke test gates non-audio transfer below **512 KiB at the title** and **2 MiB through depth 1**, plus checks for missing art. These are regression ceilings, not target download sizes. Music is intentionally excluded from the browser gate because HTML media range requests vary by browser and autoplay policy.

### Reproducible profile

Run `npm run build && npm run bench:load && npm run bench:combat` on a machine with Playwright Chromium installed. `bench:load` serves the production build, records network transfer and JS heap at the title and each depth on 1280×800 desktop and 390×844 Chromium with 4× CPU throttle. The debug depth-skip is only a measurement fixture. `bench:combat` reports median/p95 Canvas render time with warmed assets. JS heap is **not peak process/GPU/decoded-image RAM**; a physical-device measurement is still needed before declaring memory budget met.

| Metric | Before | Pack 08 local run | Gate |
| --- | ---: | ---: | ---: |
| `dist` total | ~83 MiB | 34.0 MiB | 45 MiB |
| Desktop title cumulative transfer | ~9.8 MiB | 1.9 MiB (includes music) | non-audio <512 KiB |
| Desktop depth-1 cumulative transfer | ~16 MiB | 3.0 MiB (includes music) | non-audio <2 MiB |
| Desktop Canvas p95 | not recorded | 0.3 ms | 16.7 ms |
| Mobile-4× Canvas p95 | not recorded | 1.8 ms | 33 ms |
| Desktop/mobile sampled JS heap | not recorded | max 14.2 / 12.4 MiB | diagnostic only |

Numbers are from a local headless Chromium run on 2026-11-08, not a handset or a controlled network lab. Stage transfers for later depths depend heavily on Ogg range requests and browser caching; use the script to compare runs on the same host, not as an absolute mobile-data claim. The WebP conversion was spot-compared with the PNG originals (depth-1 wall SSIM 0.991, boss background 0.985; chest transparency inspected over a contrasting background), but final visual acceptance should include a human pass in-game.
