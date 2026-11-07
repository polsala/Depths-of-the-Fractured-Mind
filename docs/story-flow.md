# Story flow and the first NPC

The authored chapter boundary is the downward stair. Optional events remain
random, but the stair resolves each outstanding required beat before starting
the boss or opening the next depth:

| Depth | Required beats before boss |
| --- | --- |
| 1 | None |
| 2 | Riot recording, then pit fall |
| 3 | Overflow ward |
| 4 | Confessional chair |

The gate uses both completion IDs and story flags so older saves with a resolved
flag do not replay a beat. If event JSON fails to load, these four beats have
minimal fallback definitions; the chapter boundary must not become an invisible
softlock. The other authored events are in depth pools and remain optional.
`npm run validate:events` fails on unreferenced events and impossible depth
assignments. `tests/story-progression.test.ts` checks seeded route reachability,
stair gating, and selection of the formerly orphaned events.

The Keeper appears next to the depth-one entrance on every generated map. A
nearby player can select **Talk to the Keeper** or press **T**. The introduction
is shown once; later interactions use a return dialogue. Choices can require
flags or inventory items, and their effects persist in the versioned save. A
truthful introduction unlocks a clue choice in the director's office on depth
two. The portrait currently reuses the vendor asset; dedicated NPC art belongs
to the art/animation pack.

**Remaining boundary:** reaching depth five is tested, but the final encounter
and ending are not yet implemented. The ending acceptance criterion of #43
depends on #41 (Pack 4) and should not be marked complete here.
