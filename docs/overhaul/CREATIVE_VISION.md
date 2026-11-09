# Creative vision — Phase 00 production contract

Decision date: 2026-11-09. Applies to the overhaul after audited HEAD `48d713e1717b7764b4fa2e59c0c1278866627252`. These are creative decisions and testable hypotheses, not claims about completed content. Read [baseline](BASELINE_AUDIT.md), [art direction](ART_DIRECTION.md), [architecture](TECHNICAL_ARCHITECTURE.md), [gates](QUALITY_GATES.md) and [roadmap](PRODUCTION_ROADMAP.md) together.

## The experience

Four former servants of an underground institution descend into the machinery that made suffering administratively acceptable. The player learns to read its spaces, protects a vulnerable party, and decides what truth costs. Horror comes from recognizing a human purpose behind a ruined room, then realizing the party helped build it.

The aesthetic is **institutional ritual**: analog admission counters, numbered queues, observation slots, concrete divisions and controlled light. Repetition expresses the Facility's rules; specific interruptions reveal people. A personal object in a carefully staged empty room matters more than a room full of gore. No direct imitation of another game's signature creatures, architecture, compositions or interface.

Success means a player wants to turn the next corner, remembers where they have been, understands a threat before choosing an answer, and cares which companion pays for survival. Technical spectacle is subordinate to that sequence.

## Identity and character contract

First-person 2.5D exploration uses a real projected space and an authoritative tile grid. Movement and quarter-turns are paced and fluid; 2D people inhabit stylized 3D architecture. Preserve turn-based combat, five depths, sanity, relationships, consequential choices and multiple endings.

The narrative source remains [design.md](../design.md), cross-checked against `src/game/characters/party.ts`, `dialogue.ts`, `story.ts`, `endings.ts` and event JSON. Preserve identities, not merely portraits:

| Protagonist | Existing identity and complicity | Play/design responsibility |
| --- | --- | --- |
| Elias Ward | Security chief who rationalized brutality and riot suppression | Protection and control; admitting an order must cost more emotionally than pressing Attack |
| Dr. Miriam Kessler | Researcher who treated patients as data and falsified ethical reality | Healing and clinical control; evidence exposes the person behind the procedure |
| Subject 13 | Fragmented experimental subject whose contradictory records resist a single identity | Perception and unstable power; a useful witness, never a joke about mental illness |
| Sister Anya Velasquez | Confessor whose reports betrayed patient trust | Sanity support and mediation; comfort and accountability can conflict |

Do not make illness itself proof of evil. The institution's choices and each person's agency carry the moral argument. Horror can unsettle without removing player consent over essential decisions.

## Pillars expressed as rules

| Pillar | Production rule | Observable proof |
| --- | --- | --- |
| The environment tells a story | Each room has an original function, a human trace and one changed condition | Player can infer function from space before reading exposition |
| Every room has a purpose | Give every traversable room a named beat: teach, anticipate, choose, fight, recover or reward | Room ledger contains no filler; remove rooms with no distinct contribution |
| Exploration earns curiosity | Frame a destination, show an unresolved clue, reward reading space | Landmark recognized on return; optional branch gives useful, finite reward |
| Sanity alters perception fairly | Signal uncertainty, preserve collision/objective truth and provide an accessible account | Same essential route at all SAN stages; optional clue remains recoverable |
| Actions respond | Accepted movement, blocked input, interaction and combat have immediate visible response plus optional audio | Timing capture and muted playthrough; one input causes one result |
| Darkness remains readable | Dark periphery supports a visible path and focal action | Door, threat and interactable remain distinguishable at native mobile size |
| Systems share an identity | Economy, UI, audio and assets use the same institutional language | No fantasy torch in a medical intake room without a narrative explanation |

## Core loop and pacing

Observe a spatial question → navigate deliberately → inspect or converse → choose a cost → resolve a tactical threat → return with a changed understanding and a practical reward. Short goals should be visible in the environment, supported by concise HUD text. Randomness can vary secondary supplies; it cannot decide whether a required room, witness or gate exists.

Use tension and rest deliberately. A quiet introduction teaches orientation; a distinctive corridor prepares a threat; a choice introduces vulnerability; combat tests preparation; a return transforms familiar space. Avoid combat on every crossing, exhaustive room searches and forced repeated text.

Target for the first slice: 12–18 minutes on a first unassisted visit, 6–10 on replay, roughly 45–65 committed steps along the main route, at most one mandatory normal combat. These are hypotheses to validate, replacing neither the existing campaign balance nor the older provisional 30–45 minute target for a whole first depth.

## Depth identities

| Depth | Established environment | Psychological question | Spatial distinction |
| --- | --- | --- | --- |
| 1 — The Threshold | Intake/security | Who is admitted, counted and permitted to leave? | Queue lanes, controlled views, release shutters and a counting landmark |
| 2 — The Archive | Records | Who gets to write what happened? | Tall filing ribs, compression aisles, inaccessible records visible across voids |
| 3 — The Ward | Medicine | When does treatment become control? | Bed bays, observation glass, shared life-support routes and occupied silence |
| 4 — The Labyrinth | Mirrors/confession | What survives a flattering version of yourself? | Paired routes with stable real geometry and deliberately discrepant reflections |
| 5 — The Core | Biomechanical engine | Can guilt be released without erasing its owners? | Converging service ribs, pressure chambers and a readable central pulse |

## Scope discipline

The first vertical slice is **The Intake Bell**, specified in [the roadmap](PRODUCTION_ROADMAP.md#the-intake-bell--authored-depth-1-slice). It establishes the visual and play standard before expanding five environments. Keep existing campaign progression available while it is developed.

Defer crafting, free movement, new protagonists, multiplayer, a new engine, open-world generation, elaborate physics and new resource currencies. Use existing combat abilities, items and event effects first. Relationships require observable companion memory and later consequence; a new meter without meaningful choices is not progress. Their current absence as a dedicated system is recorded in the baseline.

## Creative acceptance

No Phase-00 document declares award quality achieved. The slice earns expansion only after the A–G gates and five moderated first-time sessions: at least four players identify the objective and landmark without coaching, make one informed tactical choice, notice a consequence, finish without a softlock, and express interest in the next room. Collect verbatim observations and confusion points; ratings alone are insufficient. Revise or cut a beat that players consistently find tedious, regardless of its implementation cost.
