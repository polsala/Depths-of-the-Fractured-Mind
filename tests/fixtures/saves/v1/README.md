# Frozen version-1 compatibility corpus

Preserved 2026-11-09 from controller/save code at HEAD `48d713e1717b7764b4fa2e59c0c1278866627252`, seed **130013**. Fixtures contain generated maps and real serializer output, not personal user data. `savedAt` is normalized to `2026-11-09T00:00:00.000Z`.

- `exploration.json`: initial Depth-1 run, default party and real generated map.
- `event.json`: active `first_corpse` event.
- `combat.json`: active normal Depth-1 combat, real generated enemies, turn order and intents.
- `conversation.json`: active Keeper introduction.
- `progressed.json`: Depth 2, damaged/equipped Elias, medkits, changed money, completion/boss/visited flags and an opened chest. These mutations deliberately exercise persistence; they do not claim this exact state was reached through normal play.

`manifest.json` retains SHA-256, mode, depth and expected next gameplay RNG result for each file. Tests restore through the real parser/controller, check state round-trip and RNG, then continue relevant actions. Fixture maps include only depths already generated when frozen. The legacy UI eagerly creates remaining depths; compatibility work must cover that separate renderer boundary too.

**Do not regenerate these files when implementation changes.** New save versions get a separate directory and migration expectations. `utils/freeze-v1-fixtures.mjs` documents the one-time preservation procedure and uses exclusive writes to refuse replacing files. It is intentionally outside routine npm tests/build. These five examples complement the broader save/campaign tests; they are not an exhaustive historical save archive.
