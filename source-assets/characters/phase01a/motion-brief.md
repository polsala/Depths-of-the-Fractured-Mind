# Keeper / Guard motion and registration brief

Production target, not animation approval. Masters are original built-in image-generation outputs; the four protagonist assets are comparison references only and are not submitted as image inputs. Native video generation is unavailable (retained capability report). Candidate pose sequences must be visually reviewed before any runtime use; do not fabricate intervening frames, duplicate frames to increase counts, or replace acting with full-body scale wobble.

The shared output cell is 128×160 RGBA, four columns, foot/root at (64,147), with a 128-pixel standing figure target. Use a single standing-source scale for all poses of one character; collapse does not enlarge the body. Keep the same head, garment closures, prop hand and camera facing. No back/side direction set is implied by the frontal billboard. Keeper visible world height 1.72 m; Guard 1.86 m. Full card height derives from that visible height and the opaque standing bounds.

## Required genuinely different poses

| Index | Acting instruction | Phase / proposed hold |
| --- | --- | --- |
| 0 | Exact master neutral, planted shoes | idle, 700 ms |
| 1 | Small inhalation, lifted sternum and eyelid change; shoes fixed | idle, 700 ms |
| 2 | Attention hardens; Keeper tilts head toward the tag, Guard squares halt palm | alert, 180 ms |
| 3 | Prop hand draws back, weight visibly loads rear leg | anticipation, 140 ms |
| 4 | Clear held windup, distinct negative space around forearm | anticipation, 120 ms |
| 5 | Leading arm extends into the strike; short committed step | attack, 85 ms |
| 6 | Strike/follow-through; Keeper thrusts tag, Guard brings baton down | attack/impact, 85 ms |
| 7 | Prop lowered, body catches weight; stable ground contact | recovery, 140 ms |
| 8 | Weight settles back toward neutral, action arm returns | recovery, 140 ms |
| 9 | Upper body recoils from a hit, feet planted | damage, 130 ms |
| 10 | Shoulders fold and expression reacts; retain body mass | damage, 130 ms |
| 11 | Regains composure, prop still in same hand | recovery, 180 ms |
| 12 | Knees give; torso lowers without changing scale | defeat, 150 ms |
| 13 | Kneeling, prop releases or lowers; face remains recognizable | defeat, 170 ms |
| 14 | Body rests on its side; silhouette clearly fallen | defeat, 220 ms |
| 15 | Settled final fallen pose, same body and costume | defeat, hold |

Keeper's living scene is an NPC. Threat/attack/defeat clips are production references and isolated visual fixtures, not a new Keeper fight or a narrative change. Guard exploration previews similarly use presentation fixtures; no new roaming enemy, collision, encounter or RNG consumer is authorized.

Read attack as anticipation → commitment → recovery inside the existing visual-cue interval. Animation never delays or applies damage, grants invulnerability, changes turn order or writes saves. Reduced motion uses a stable representative pose and existing textual action/intent cues. Fallen characters use the settled pose. Keep every actual generated pose and its prompt; reject inconsistent anatomy, flipped prop hands, crossed cells or invented duplicate frames rather than hiding them through retiming.
