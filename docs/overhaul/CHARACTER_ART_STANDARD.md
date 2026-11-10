# Character reference standard — Phase 01A

Production direction: **institutional courtesy turned coercive**. These are implemented review candidates, not human artistic sign-off. [Evidence and disposition](evidence/phase01-art-approval/README.md) govern approval. `docs/design.md` remains the character/backstory authority. No protagonist source, atlas, identity or combat rule is replaced.

## Shared language

Use compact adult proportions, approximately four to four-and-a-half head heights, enlarged readable heads/hands, a stable frontal three-quarter view and shoes with a clear gap. Exaggerate former function through one large costume mass and two purposeful silhouette cues. Keep anatomy human; unease comes from fixed courtesy, enforced procedure and expression. Avoid generic zombies, fantasy anatomy, gore, tactical science-fiction armor and costume clutter.

Elias remains the compact slate security silhouette; Miriam the bone coat/burgundy surgeon; Subject 13 the ash/bandaged witness; Anya the deep-teal hood. New art takes those four as the local comparison family. Their images were **not submitted as generation inputs**, and they were not redesigned to match a weak replacement. Compare all six at equal visible height, then at their real in-game proportions. Equal-height gallery normalization is a review composition, not a change to hero rendering.

| Design | Large form | Separating cues | Focal point |
| --- | --- | --- | --- |
| Keeper | Narrow petrol waistcoat and pale sleeves | White hair/high collar; hanging brass claim tag opposite a green ledger | Severe pale face; closed mouth and fixed courtesy |
| Guard | Broad slate uniform with rigid raised collar | Squared cap; outward halt palm opposite a blunt baton | Squint above a folded admission slip covering the mouth |

The Keeper's original gray-green face, coat and limbs collapsed into one value group. Tiny irregular items and random texture obscured his anatomy and function; the old vendor source did not share the protagonists' proportions. The original Guard was an emissive outlined vector icon, including a whole-body bob/lunge, beside shaded raster people. Neither is the new family standard.

## Palette, values, light and surfaces

| Role | Anchors | Use |
| --- | --- | --- |
| Shared shadow | ink `#182329` | Selective contour, seams, shoes; retain shape in right-side shadow |
| Institutional cloth | petrol `#34484a`, slate `#334653`, cloth midtone `#63717a` | Quiet broad torso/leg masses |
| Human/administrative focal | bone `#c7c1aa`, ash `#959487` | Face, collar, sleeve and paper; face is the primary reading mass |
| Sparse accent | oxblood `#624348`, brass `#b99b63`, leather `#695447` | Tie, claim tag/badge, glove/baton; no glowing borders |

These are palette roles, not a claim that every painted pixel equals an anchor. Warm flesh separates the Keeper from petrol cloth; the Guard's cooler face, leather and bone slip separate from slate. Keep roughly four broad value groups before finer shading. At 48–64 px body height, viewers must distinguish head, opposing hands, torso and separate planted boots in grayscale. Do not rely on eye glow, a saturated outline or bloom to identify a person.

Shade with a broad upper-left key and retained right-side form. Paint cloth as matte planes/folds, paper as a quiet flat light shape, leather as a broad dark mass, and brass with one small light edge. No random scratches, photographic pores, per-pixel dither or baked environment/floor. Face/hand detail gets priority over button and garment detail. Selective dark contours are part of the painting, not a uniform vector stroke.

Retain the existing softened protagonist family. This is **low-resolution shaded raster art**, not a claim of a mathematically perfect legacy pixel grid. Runtime cards use nearest sampling and no mipmaps. The accepted candidate normalization uses the native 128×160 grid; a tested 64×80 → 2× variant lost facial expression and is retained as a rejected density comparison. Do not reduce a character merely to make its texture count resemble another source.

## Frame, alpha, scale and registration contract

- Source concepts and generated pose sequences live in `source-assets/characters/phase01a/`. Preserve raw outputs and prompts. Build outputs live under `public/assets/sprites/characters/keeper/` and `guard/`.
- [Character atlas contract](../../src/assets/character-atlas-contract.json): 512×640 RGBA atlas, four columns/four rows, 128×160 cells, 16 distinct authored pose drawings. Do not change the existing 512×512 hero contract.
- Visible standing target is 124 px. This leaves room for the full-width fallen poses in a 128 px cell. A single scale per character is used across every pose, including defeat. Never enlarge a collapsed body to fit its bounding box.
- Foot pivot is `(0.5, 0.92)`, registered about `(64,147)` in a frame. Explicit inspected source ground lines are retained in `registration.json`; no per-frame size normalization, silhouette-component deletion or torso clamping. Target idle contact drift ≤1 native pixel and ground tolerance ≤2 px. Attack stepping is intentional; it must not become loop skating.
- The Keeper is 1.72 m visibly standing; the Guard 1.86 m. Mesh/card height accounts for transparent padding. Upright yaw-only billboards use the world depth buffer, not screen-size clamps. Only a frontal three-quarter facing is supplied; directional walking is not implied.
- Raw native alpha is preserved in source. Deterministic premultiplied area normalization rejects negligible low-alpha colored fringe, then creates binary runtime alpha. No baked checkerboard, halo, floor or cast shadow. Inspect on dark and light backgrounds. Transparent pixels have zero color, and character extremities retain safe cell margins.
- Materials keep source colors neutral (`white` multiplier), matte response and a bounded 0.18 texture-masked emissive fill; practical world lighting and occlusion remain. No lighting architecture or environment kit changes are part of this milestone.

`npm run characters:build` regenerates all four runtime PNGs and the build manifest. `characters:check` recomputes and compares them during every production build. It rejects stale outputs, empty/clipped cells and exact duplicated poses. Unique hashes are technical evidence, not proof that motion is expressive.

## Acting and timing

Both candidates supply real neutral/breath, alert, loaded windup, strike, follow-through, catch/settle, recoil/fold, regain, knees-give/kneel/fall/settled drawings. [Source motion brief](../../source-assets/characters/phase01a/motion-brief.md) describes each index. Holds reuse an intended key pose through timing metadata; no duplicate image is inserted to inflate a count.

| Clip | Source frames | Timing / intent |
| --- | --- | --- |
| Idle | 0,1 | 700 ms each, restrained breath/eyelid loop, no mesh scaling |
| Alert | 2 | 240 ms held attention/halt |
| Anticipation | 3,4 | 120/100 ms, load then held windup |
| Attack | 3–8 | 120/100/70/90/130/140 ms, total 650 ms within the existing visual-cue window |
| Recovery | 7,8,11 | 140/140/180 ms, catch/settle/composure |
| Hit | 9,10,11 | 120/130/150 ms, recoil/fold/recover |
| Defeat | 12–15 | 140/160/180/170 ms, then retain the final fallen drawing |

The Keeper threatens by presenting/thrusting the tag while retaining the ledger; the Guard loads and brings down the baton while the halt palm becomes a balancing hand. Costume, prop ownership, head volume and facing must remain stable. Limited-key-pose animation is deliberate; do not advertise these as smooth high-frame-rate clips. Source identity/detail drift and loop seams still require human motion review.

Reduced motion holds the first stable action pose and the **last** settled defeat pose. Existing DOM intents, HP/SAN and action results remain authoritative. Animation cannot defer/apply damage, change RNG, add a turn, grant invulnerability or write a save.

## Integration and review

The normal game uses the Keeper in Admissions and the existing Guard in the evidence bay/combat. The Guard's presence derives from existing encounter state; a defeated escaped Guard is not resurrected for presentation. No new encounter, path, collision or interaction is introduced. Its world placement is clear of the chair, legal travel lines and the mobile opening sightline.

Keeper combat and arbitrary action/defeat playback are **isolated art fixtures**, not a new Keeper fight. `?qa=1&art=1` loads a laboratory using the real `DungeonRenderer`, `renderCombatUI`, party atlases and character clip selector. It does not read/write player saves or apply actions; state/RNG fingerprints are checked after presentation changes. Normal game captures separately show the real HUD and event-entered Guard combat.

Approval package: all six at equal 124/64/48 px visible heights (48 px grayscale), both world cards, both combat presentations, every pose, real browser motion clips, desktop 1280×800/mobile 390×844 at DPR 1/seed 130013, and rejected iterations. Inspect native crops, value hierarchy, alpha over light/dark, held poses, contacts and transition seams. No source-image-only approval.

## Approval boundary

This locks a **reviewable production standard**, not subjective approval. An owner/art director must accept the six-character family, the Keeper's identity and both motion sets at actual game scale. Per-file generation chains and checked provider terms support the new pair’s documented project-use/distribution rights; this is not clearance merely from generation or commitment. Backend model ID was not exposed, and no exclusive copyright, uniqueness or uninspected account exception is asserted. Human artistic acceptance remains open. The pre-existing 45 distributed media files remain separately unverified. Phase 02 and five-depth kit expansion remain outside scope.
