# Pack 06 — Combat design and measured targets

This pass targets a **standard** difficulty, without hidden debug advantages. It does not add selectable difficulty modes. The intended path is readable telegraphed threats, occasional guard/taunt and healing decisions, and finite consumable/ability resources. Enemy intents are committed at the start of each round; `Stand Firm` deliberately redirects those existing intents. Guard halves incoming HP damage until that actor's next action. Bosses can be staggered, but resist another stun for three rounds. Damage-over-time and stat changes expire; level-ups restore 30% max HP and 25% max Sanity rather than resetting the party.

| Depth | Normal roles | Boss mechanic / response | Roll chance on marked tiles | Targeted pacing |
| --- | --- | --- | ---: | --- |
| 1 Threshold | Guard: single target/control; rat: quick multi-hit | Warden: crushing blow or party fear. Read target, guard or heal before the impact. | 15% | 2–4 rounds normal, 5–10 boss |
| 2 Archive | Wraith: bleed/Sanity; filing beast: armored/AoE | Keeper: memory pressure. Focus fire and manage Sanity. | 20% | 2–4 normal, 3–8 boss |
| 3 Ward | Husk: poison; surgery horror: burst/stun | Physician: self-repair and poison. Interrupt once, then manage its stun resistance. | 25% | 2–5 normal, 3–8 boss |
| 4 Mirrors | Twin: focus debuff; guilt form: Sanity drain | Mirror Self: AoE and focused burst. Taunt/guard a telegraphed strike. | 30% | 2–5 normal, 4–9 boss |
| 5 Core | Spawn: stun/corruption; amalgam: group pressure | Engine Heart: AoE HP/Sanity attrition. Reserve healing and consumables. | 40% | 2–5 normal, 4–10 boss |

The roll chance is **only** used on encounter-marked tiles, not every walking step. Map generation and the player's path affect actual frequency. The reference walk (seed 33, safe shortest routes) made 279 moves and won 27 encounters before the final choice, consuming one healing/Sanity item; it is not a claim about every seed or player style.

## Reproducible simulation (2026-11-07)

Run `REPORT_COMBAT_BALANCE=1 npm run test:unit` for the full metrics. The tactical policy prioritizes healing a seriously hurt ally, support healing when several members need it, a caster attack when resources permit, otherwise focus-fire and guard under concentrated threat. Twenty seeds each play three normal encounters and one boss per depth, carrying real XP, drops and HP/Sanity forward, without debug options or a free inventory. **18/20** won all five depths. No fight exceeded the 250-action softlock cap. This models combat only; event/trap/navigation attrition is excluded from this sample.

| Depth | Normal wins | Normal rounds | Normal HP / SAN cost | Boss wins | Boss rounds | Boss HP / SAN cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 60/60 | 2.6 | 7.4 / 0.9 | 20/20 | 8.1 | 53.9 / 50.5 |
| 2 | 60/60 | 1.9 | 8.0 / 9.0 | 20/20 | 3.0 | 10.3 / 26.6 |
| 3 | 60/60 | 2.2 | 9.0 / 10.7 | 20/20 | 3.8 | 10.8 / 16.0 |
| 4 | 60/60 | 2.5 | 9.9 / 12.5 | 20/20 | 4.1 | 14.9 / 30.5 |
| 5 | 60/60 | 2.6 | 18.3 / 16.4 | 18/20 | 5.4 | 90.5 / 54.7 |

HP loss and Sanity spend are sums of **positive drops between actions**, so healing/level-ups do not make a resource cost appear negative. They may undercount a heal and hit within the same action. The same seeded test also walks a generated map, resolves real events/combat, and reaches the depth-five decision with no cheats. This is an automated policy, not a moderated human playtest or proof that every seed is winnable. Human tuning remains necessary, especially around the early difficulty spike at Warden and the final Engine Heart.

## Visual/performance contract

All 15 enemies have unique code-authored vector silhouettes with a normalized 100×100 cell, feet pivot and hitbox metadata. Combat renders idle/attack/hit/death states, telegraphed target and ability, damage/healing readouts, and status in the log. Missing IDs fall back to a text initial. Reduced-motion starts with effects disabled and the toggle can skip them at any time; no animation blocks input. This is a coherent first art pass, not a claim that commissioned final illustrations or rights review (#57) are complete.

`npm run bench:combat` measures 80 warmed Canvas draws in headless Chromium. Measured locally: desktop 1280×800 median **0.2 ms**, p95 **0.3 ms** (16.7 ms budget); mobile 390×456 with 4× CPU throttle median **1.0 ms**, p95 **1.9 ms** (33 ms budget). This is a desktop-based phone proxy, not a physical-device measurement; rerun on actual target hardware before release.
