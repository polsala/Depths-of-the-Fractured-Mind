# Phase 02A specialist A — material production

Ownership: `MaterialLibrary.ts`, one presentation-only floor-role selection in `SceneBuilder.ts`, original source/runtime material files, deterministic derivative builder, new-media provenance records. No generator, save, Presence, combat, camera or fixture edits.

Actual installed skills read:

- `/home/psala/.agents/skills/create-game-assets/SKILL.md`: inspect/technical-frame/representative-family/normalize/in-context/provenance workflow. References `art-direction.md`, `raster-pipeline.md`, `provenance.md` read.
- `/home/psala/.agents/skills/threejs-aaa-graphics-builder/SKILL.md`: all four references `visual-scorecard.md`, `authoring-recipes.md`, `technical-art.md`, `shader-cookbook.md` read; all three scorecard anchor JPGs directly viewed.
- `/home/psala/.agents/skills/threejs-materials-lighting/SKILL.md` and `references/materials-lights-table.md`: stock StandardMaterial roughness/metalness, sRGB albedo versus linear data; no expensive transmission, extra lights or post.
- `/home/psala/.agents/skills/threejs-scene-setup/SKILL.md` and `references/scene-graph.md`: actual pinned Three0.187.0, instanced transforms and existing resource ownership.
- `/home/psala/.codex/skills/.system/imagegen/SKILL.md` and `references/prompting.md`: built-in original generation, exact raw output retained in project, no CLI/API substitution.

Discovery followed installed paths/symlinks in `~/.agents/skills` and `~/.codex/skills`; no local `.agents/skills` catalog was found. `bash /home/psala/.agents/skills/threejs-game-director/scripts/probe_asset_credentials.sh` exited0: Tripo/Gemini/ElevenLabs MISSING. Built-in imagegen remained available without a key. No `/skills` shell command was run.

Before editing, inspected retained Phase02 desktop indexing/gallery/drum and fresh Phase02A baseline desktop indexing/mobile drum. Flat dark albedo and identical unit-box texture stretching were confirmed. Parent authorized edits only after fresh82case room/motion audit completed.

Decisions and implementation:

- One original six-swatch 1536×1024 material master generated with built-in `image_gen`; source neutral paint, concrete, linoleum, aggregate, steel and paper kept coherent. The lead accepted this internal production target; it is not human artistic approval.
- `material-prompt.txt`, original PNG, `generation.json` (actual local output ID, SHA, raw PNG chunk observations; model/seed/cost unknown), twelve source derivatives and `build-manifest.json` retained under `source-assets/environments/archive-phase02a/`.
- `utils/build-archive-materials.mjs` handles deterministic area sampling, edge repair and controlled neutralization. It emits six256pxalbedo and sixlinear packed height(R)/roughness(G) losslessWebP files under `public/assets/textures/archive-phase02a/`. Totals:468,372runtimebytes,3,145,728decodedbytes excludingmipmaps. Metre-scale finish detail is independent of game/decoration RNG.
- Archive-only stock shader UV adapter preserves instancing and conventional StandardMaterial shading. Each2mrepeat uses256pixels; inverse-scale-corrected instance normals select dominant projection axis. Default/non-instanced UVs, signs, Intake and fallback remain unchanged. No animation clock/uniform/pass/dependency added.
- Brighter enamel/wall/floor palette multipliers avoid doubling the source tint; paint dielectric metalness.04, steel.42; material-specific bump.007–.026m and packedroughness separatepaper/paint/steel. Servicefloorsderiveexistingroom.materialRole, withoutchangingmapstate.
- 25newmedia ledger entries include scoped provider-use/distribution basis. Fresh official EuropeTermsContent and ServicesAgreement4.1–4.4 read on2026-11-11; original41distributedunverifiedlegacyrecords unchanged. Human materialart acceptance pending; raw C2PA container retained withoutcryptographicverification.

Commands/outcomes:

- Initialbuilderattemptfailed: `cwebp` unavailable (`ENOENT`). Changedderivativeencoder to existingFFmpeg/libwebp, no graphics dependency.
- SandboxFFmpegchildspawnfailed`EPERM`; samebuilderrerunelevated succeededexit0. Notatestfailureandnoassertionrelaxed.
- `node utils/build-archive-materials.mjs > artifacts/phase02a/material-build.json` exit0; allhashes/dimensionsretained.
- `npm run typecheck` exit0 aftercompositionworkerresolvedtemporaryunusedvariable.
- `npm run assets:provenance` exit0:147inventoried/41distributedunverified/0failures.
- `npm run build > artifacts/phase02a/material-build-command.log 2>&1` exit0:36.0/45MiB, existing>500kBlazyrendererwarningretained.

QA repeat PNGs `artifacts/phase02a/{concrete,enamel,linoleum,service,steel,paper}-repeat.png`, each3×3atnative256pxswatch. AllsixopposingedgeRGBdeltas0; directlyviewedconcrete/enamel/linoleumrepeatimages andthemaster. These are source/repeatQA, not proof of in-gamequality. Parent owns integratedhardwarecaptures, completevisualreview/performanceandfinalacceptance.
