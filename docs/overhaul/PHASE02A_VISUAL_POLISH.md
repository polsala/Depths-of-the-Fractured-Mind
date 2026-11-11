# Phase 02A — Archive visual polish candidate

Started 2026-11-11 from clean `main` at `a55290ff3755ae802c547d630593870d59514934`. Scope is the existing Archive presentation. No generator version, saved geometry, collision, gates, IDs, feature/reward positions, story flags, combat, protagonist art or presence clock is changed. The owner subsequently authorized a local development commit after validation. Push, deployment and other-depth expansion remain outside scope; evidence retains the tested pre-commit parent and exact source/build hashes.

## Audit and corrections

Fresh actual hardware-Chromium baseline:82 cases/164 PNGs, desktop1280×900 / mobile 390×844, DPR 1, seed130013, normal/reduced motion, four identities, grayscale and connected input. Additional56 studies cover grayscale in all ten rooms and gallery/drum approaches across130013/130014/73021. Retained Phase 02 images were also inspected. The defect ledger records exact cameras, player impact, causes, severity and before images.

| Verified defect | Resulting presentation |
| --- | --- |
| Flat dark concrete, enamel and floors; tiny and large props stretched identical unit UVs | Original shared finish family with restrained height/roughness and consistent256 px / 2 m world sampling; service aggregate differs from public linoleum |
| Gallery ended in three equal banks, with long walls empty in one orientation | Long-axis filing ranks, staggered heights, interrupted return bench, receding overhead retrieval rails and one withdrawn-original focal bay |
| Full drum shaft filled the missing void; identifier hidden behind ring | Split grounded bearings leave the center open; identifier attaches flush to the exposed radial cut face, outside the missing quadrant |
| Quiet tasks were black silhouettes below uniform center lighting | Shared room-specific practical derivation puts warm task light on former human work and cool fill on enclosing architecture |
| Posts and later task hoods crossed titles | Forward station nameplates, narrower/asymmetric task hoods, lowered maintenance plate and clear gallery focal sign |
| Horizontal tape reels vanished from1.6m eye height | Upright paired reels, control face, take-up roller and interrupted transcription |
| Entrance and exit were identical shutters | Inbound roller cradle/cancelled consignment versus sealed dispatch folios/empty recipient pocket/paired locks |
| Service and secret rooms lacked human traces | Interrupted hoist/inspection mechanism, removed service panel, worker card and finite medical packet cues |

The missing-file trace, absent number interval, cancelled delivery and incomplete transcription communicate deliberate control of records without new events or mechanics. Cabinet variation derives only from the existing room decoration seed. All ten room roles and their former uses remain in the executable Phase 02 ledger.

## Architecture and material boundaries

`ArchiveRoomRenderer` continues to feed static batches through the existing SceneBuilder sink. `ArchiveLighting` is a pure presentation adapter over immutable room metadata; it does not revise persisted sockets. It shares closed-wall station/gallery anchors between architecture and lighting. A door is never treated as a wall. Room pairs remain stable throughout a room, corridors use retention bias, four permanent PointLights crossfade retiring sources in place through the existing update clock. Rapid transitions wait for dark slots before relocation.

Six original finishes—concrete, enamel, linoleum, service aggregate, steel, paper—share a single generated master. Twelve 256×256losslessWebP derivatives contain six sRGB neutral color maps and six linear packed height(R)/roughness(G) maps. Total468,372 bytes,3,145,728 decoded bytes before mipmaps. Palette roles remain umber/paper/ink/amber; color multipliers preserve surface readability. Paint is dielectric; exposed hardware supplies the harder response. World-projected sampling corrects nonuniform instance scaling while retaining standard Three.js lighting/bump/roughness. Intake and non-Archive materials keep their original path.

Source PNG, prompt, raw metadata, provider-use observations, deterministic derivative builder and hashes remain separate from public runtime outputs. No third-party texture or reference image was used. This chain documents the new media's project-use basis;41 unverified distributed legacy files remain a public-release blocker. Human material approval remains pending.

## Iteration and verification boundary

Iteration1 was rejected for task-hood/title overlap, bright upper-cabinet hotspots and a cropped floating drum placard. Revision2 corrected most signage but exposed a hidden cut-face plaque and an over-high maintenance title. Final corrections attach the plaque to the actual cut face and mount the maintenance nameplate on its service opening. Rejected images and critique are retained; baselines were not updated to disguise these defects.

`compare-archive-polish.mjs` checks40 matched before/after room pairs for exact camera, authoritative location, viewport, quality and protagonist. Saved semantic-room JSON is identical. The architecture test projects actual cosmetic bounds over100 fixed seeds and rejects intersection with legal eye positions; it also checks map/RNG passivity. Light tests cover100-seed closed-wall anchors, stable room pairs, four-light bounds and rapid-transition retirement. Existing1,000-seed, legacy save, normal journey, presence and renderer lifecycle checks remain the regression foundation.

See [the evidence report](evidence/phase02a/README.md) for executed commands, measurements, direct image/motion inspection, scorecard, source/build hashes and precise open gates. This implementation is a visual production candidate. **Human artistic approval: PENDING HUMAN REVIEW.** No self-score or automated result grants that approval or establishes uncoached navigation, emotional impact or enjoyment.
