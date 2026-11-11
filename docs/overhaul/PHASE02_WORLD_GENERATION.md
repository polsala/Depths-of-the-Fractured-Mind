# Phase 02 — world generation and semantic architecture

Implemented against clean `main` HEAD `96a2d0aae7c3384379885624d6df687275e5db5f`, 2026-11-10. This is a reviewable implementation candidate, not owner artistic approval. Scope is the new-run Archive and a reusable semantic rendering boundary. Intake Bell and Depths 3–5 retain their existing generation/content. The owner subsequently authorized a local development commit after verification. Publication, push and deployment remain outside this request.

## Confirmed prior defects

The retained `map-generator.ts` places random rectangles with overlap rejection; its BSP comment does not describe a recursive partitioner. It connects accepted rooms sequentially. `ensureConnectivity` measures reachability, warns below 90% and neither repairs nor rejects. Features and events are added afterwards through random coordinates; event assignment can omit or overwrite a beat. It consumes the shared persisted `gameRandom` stream. These observations come from source inspection, not an invented failed-seed measurement. The original implementation remains unchanged for legacy continuation.

## New generation boundary

`newGame` opts into `state.generationPolicy = { version: 1, runSeed }`. `getDepthMap(depth, cache, policy)` returns an existing map first. Only policy-v1 Depth 2 uses `generateArchive`; other depths retain current generation. Graphics receives already-created maps and cannot request generation.

The generator establishes typed progression nodes and edges before carving. The graph assigns room archetypes, mandatory event roles, optional evidence and secret branches, a controlled loop and guardian/exit progression. It then places authored room proportions in bounded separated slots, applies reflection/quarter turns and spacing variation, and routes orthogonal corridors around unrelated rooms and the solid drum footprint. This is constrained graph embedding, not a claim of general graph-layout optimization or classical BSP.

Layout, feature and cosmetic streams derive from run seed, depth ID, `archive-v1` and a stream label through pinned FNV-1a plus xorshift32. Layout retries derive stable attempt streams. No global RNG, time, render call or asset readiness enters generation. Cosmetic salt changes decoration identity without changing authoritative tiles. Already generated maps and mutations are saved in full and never regenerated on load.

Ten purposeful archetypes are currently present in every generated Archive. Arrangement, orientation/proportions, corridor routes, controlled-loop destination and feature positions vary. Optional activity is optional even though its room is present. Optional-room omission and wider graph grammars remain future controlled variety work; no claim of unlimited spatial diversity is made.

## Validation and bounded failure

Generation validates before returning a map. The validator checks semantic schema and IDs; connected traversable regions with the seal released; valid start/exit; required feature/event reachability; room overlap; feature conflicts; legal orthogonal corridor paths; available dependencies; a reachable index before its seal; evidence inaccessible with the seal closed and reachable after release. Invalid attempts retry deterministically up to four times, then throw rather than warn and deliver an invalid world.

`tests/archive-generation.test.ts` sweeps 100 fixed seeds in normal units and 1,000 via `npm run validate:archive`. It also pins derivation outputs, exercises deliberate malformed/disconnected/duplicate/missing-beat/bypassed-gate cases, checks order/cosmetic/gameplay-RNG isolation, persisted-map reuse and save round trips. The extended result applies to Archive only. Exact final commands/outcomes are in the validation report.

## Save schema and legacy policy

Save schema v3 retains the existing storage key. v0–v2 parse through their established migrations with no generation policy. Legacy v3 re-saves may still omit the policy, preserving that distinction across future reloads. New policies require version1 and a valid seed matching the run's saved initial seed. Unsupported policies/semantic schemas are rejected before import replaces storage.

A loaded legacy save with only Depth 1 continues into an ungenerated Depth 2 through the **original generator and saved gameplay stream**. Existing old maps, including event/door/item/NPC mutations, are returned unchanged. New-run Archive generation does not advance combat RNG; revisits use the saved map reference. No migration serializes the presentation viewpoint, hands, clocks, textures or camera interpolation. Immutable `tests/fixtures/saves/v1/` remains untouched.

## Serialized semantics and presentation

`world-definition.ts` contains plain versioned data: room identities, archetypes, purpose/former use/human trace/focal point, bounds, sightline, constraints, material roles, event references, decoration seed, light/prop/feature sockets; edges carry traversal, gate/dependency and routed path data. Authoritative `DepthMap.tiles` alone owns collision and mutable interaction state. Semantic metadata identifies the generated world's architectural composition; it is not a second mutable collision map.

`presentDungeon` deep-copies/freezes semantic data and mutable tile projections. `ArchiveRoomRenderer` consumes that snapshot through an architecture sink into the existing SceneBuilder batching/material/resource lifecycle. It does not import the controller, gameplay RNG or generator. Static geometry builds on depth entry. Dynamic doors update from committed tiles. The Intake-specific composition remains separate and preserved.

The Archive kit uses shared chamfered filing banks, repeated drawer/handle/label details, transfer desks, an index machine, tape retrieval, evidence cage, service grilles and a thick segmented open drum. Heights vary by archetype. Room light sockets feed fixed-budget practical selection and transition interpolation. All resources remain owned/disposed by the existing renderer. Unknown NPC presentation IDs resolve to a neutral labeled fallback instead of the Keeper's identity; Keeper and Guard references remain explicit.

## Presence and rules

`archive/interactions.ts` reads only the current/facing feature. The controller commits INDEX latch release, existing event start, finite cabinet collection or inspect text. The UI only then asks the existing PresenceDirector for its existing reach/inspect/use pose. Existing combat timing, CameraRig, presence view lifetime and character art are preserved. No followers, held-object art, new animation clock, camera bob/shake/FOV change or action callback is added.

The Archive story pool does not randomly interrupt its graph-assigned evidence and recovery sequence. Its guardian and event consequences use the existing systems. Optional cabinet partial collection preserves remaining stacks; legacy chest behavior is left at its compatibility boundary. DOM objectives, room notices and named interactions remain available in the labeled Canvas fallback, reduced motion and muted audio.
