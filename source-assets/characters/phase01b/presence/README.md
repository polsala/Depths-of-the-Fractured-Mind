# First-person hand assets — Phase 01B

These are original-input, generated **review candidates**, not human artistic acceptance. Eight held key poses per protagonist support the passive presence timeline; they are not claimed as video-derived or smoothly inbetweened animation. No gameplay rule, save or RNG is encoded here.

The full prompts and [generation record](generation.json) retain the source chains. The host `image_gen` tool supplied native RGBA images (1774×887); the backend model/version and per-image cost were not exposed. The first Elias sheet references his newly generated master. The other sheets reference their own masters for costume/skin identity and Elias's sheet for first-person perspective, shared key-pose vocabulary and broad shaded raster treatment. No legacy image was submitted as a generation input. Rights evidence is tracked in the main Phase-01B provenance record; generation and repository presence alone do not clear rights.

| Character | Retained visual identity | Hand language |
| --- | --- | --- |
| Elias | Warm-tan fingertips, worn brown fingerless gloves, slate coat and bone undercuffs | Guarded rest, firm protective fist, economical reach |
| Miriam | Pale bare fingers, narrow bone coat cuffs and burgundy undersleeves | Precise reach, small controlled palm action, clinical support |
| Subject 13 | Pallid long fingers, bone bandages and olive patient sleeves | Delicate reach, fragile defensive palm, tense half-open fingers |
| Anya | Warm-olive hands, deep-teal sleeves and bone undercuffs | Composed reach, open-palm support, measured brace |

The shared pose order is idle, interact, inspect, attack, cast/support, brace, hurt, tension. No unearned held prop, weapon, magic glow, gore or shooter reticle is present. The inspection pose is an empty-hand gesture, not a promise that an item has entered inventory.

## Deterministic normalization

Run `node utils/build-presence-atlases.mjs`; `--check` recomputes and compares runtime PNGs and their build manifest. Sources remain separate. Each source equal cell uses the same area-sampling scale, **0.7 of a 256×256 cell**, about `(128,256)` bottom-center. It does not fit each pose's bounding box. Source alpha below 128 is excluded from premultiplied area coverage; runtime alpha is binary and transparent RGB is zero. The first 16 source pixels at each row's top are a transparent guard against the previous row's cut cuff edge. Anya's first row uses one explicit −2 source-pixel root correction across all four poses; an initial build otherwise left a one-runtime-pixel gap at the bottom. Root metadata stays identical for all output poses.

The output deliberately leaves large transparent margins: idle hands occupy the bottom ~50 pixels of their 256-pixel cell. A supported-wrist hurt pose can rise farther while staying below the scene's focal zone when displayed at the reviewed runtime size. Actual obstruction and artistic quality still require the desktop/mobile in-game captures.

## Technical QA and rejected check interpretation

`tests/presence-assets.test.ts` passes **5 tests**, checking all 32 distinct nonempty poses, source/output hashes, frame bounds, binary alpha/zero transparent RGB, clear top/sides, bottom forearm contact and stable `(128,256)` roots. `--check` passes. The installed `create-game-assets/scripts/asset_report.py` reports correct 1024×512 RGBA outputs, alpha 0–255, and no problems for all four. `build_preview_sheet.py` produced the family contact sheet at `artifacts/phase01b/presence-preview.png`.

The installed sprite-forge **raw full-body spill check failed**, retained at `artifacts/phase01b/presence-elias-spill/sheet-qc.json`. Exact published rows:

| Check | Status | Value | Threshold |
| --- | --- | --- | --- |
| `cross_cell_components` | fail | 5 | 0 |
| `cross_cell_visible` | fail | 5 | 0 |
| `sheet_edge` | fail | 8 | 0 |
| `boundary_band` | warn | 7087 | 0 |
| `safe_frame` | warn | 8 | 0 |
| `faint_specks` | warn | `{"floor_px":77523,"detached_components":5}` | 0 |

This generic check treats adjacent forearms that meet at their intentionally cut bottom corners as connected whole-body art and disallows every image-edge cut. That is unsuitable for a first-person overlay with forearms entering from below. It was not relabeled a pass or used to delete limbs. The fixed source-cell slicing and overlay-specific runtime tests instead preserve the intended cuts and require complete fingers, clear side margins and bottom contact. Native alpha-floor haze and stray transparent RGB are eliminated deterministically in normalization. No existing check or budget was weakened. A first test implementation also exceeded Vitest's 5-second limit because it made millions of per-pixel assertions; aggregating the same pixel predicates reduced the suite to ~110 ms without changing coverage.

## Skills materially applied

- `/home/psala/.codex/skills/.system/imagegen/SKILL.md`: read fully; host built-in generation, native transparency, real reference attachments, inspect/save project-bound source. `references/prompting.md`/CLI fallback were not needed; CLI was not invoked.
- `/home/psala/.agents/skills/create-game-assets/SKILL.md`: read fully; family identity locks, one seed/reference, deterministic normalization, separate source/runtime, in-context acceptance boundary. Reviewed `assets/art-direction-brief.md`, `assets/asset-manifest.json`, `references/raster-pipeline.md`, `references/provenance.md`; used `scripts/asset_report.py` and `scripts/build_preview_sheet.py`.
- `/home/psala/.codex/skills/generate2dsprite/SKILL.md`: read fully; shared root/scale, honest route records, alpha and frame checks, no duplicated pose padding, numeric QA cannot approve anatomy. Read `references/animation-planning.md` and `references/prompt-rules.md`; evaluated `scripts/sheet_qc.py spill` and retained its failed raw report. The host-image skill owns generation calls; unavailable video capability was audited separately by the cast-art workstream.

Human hand-anatomy, identity-family, pose-transition and motion acceptance remain open. The runtime uses small eased presentation offsets and selected held poses; it does not manufacture a claim of high-frame-rate sprite acting.
