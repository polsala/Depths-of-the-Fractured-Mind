# Systems Overview

Deep-dive notes on the game’s major systems so you can extend features safely.

## Exploration & Maps
- **Generator:** `src/game/exploration/map-generator.ts` builds per-depth maps (size/room config per depth). Corridors link BSP-style rooms; `ensureConnectivity` warns if connectivity is low.
- **Tiles:** `MapTile` in `src/game/exploration/map.ts` holds type, passability, events, encounters, chests, vendors, stairs, doors. `generateDepthMap` converts game maps for graphics.
- **Movement:** `src/game/exploration/movement.ts` updates location; `GameController` wrappers enforce exploration mode and post-move hooks.
- **Visibility/Renderer:** `src/graphics/renderer.ts` uses a raycast-style pass for walls with textured tiling for floor/ceiling and ground-anchored billboards for entities (chests, vendors, stairs). Textures live under `public/assets/textures/depth*/` and `public/assets/textures/global/`.
- **Debug Spawn:** UI debug panel can spawn showcase entities near the player (chest/vendor/stairs/door) via `GameController.debugSpawnEntitiesAround()`.

## Party, Stats, Equipment, Inventory
- **Party State:** `src/game/state.ts` holds party members, inventory, money, and flags. Stats include HP/SAN and combat attributes (attack/defense/will/focus).
- **Equipment/Stats:** `GameController.recomputeStats` applies equipment bonuses when gear changes; preserves HP/SAN ratios. Add new gear bonuses in `ITEMS` to flow through.
- **Inventory:** `src/game/inventory.ts` (and `ITEMS` in `src/game/items.ts`) defines items, stacking, and usage. Money lives in `party.inventory.money`; keep pricing and rewards consistent with depth and encounters.
- **Loot/Rewards:** Chests (`MapTile.chest`) and encounters should grant items/money consistent with `ITEMS` definitions and vendor pricing.

## Combat
- **Encounters:** `src/game/combat/encounters.ts` defines procedural and boss encounters; `GameController.startCombat` boots fights (debug panel can start standard/boss combat).
- **State & Turns:** `src/game/combat/state.ts` and `turn-manager.ts` drive turn order and action submission (`submitAction`). Add abilities via `CombatAction` pipeline and ensure effects adjust stats consistently.
- **Debug Options:** One-hit kill and XP multiplier (see Debug Options below) are applied via `GameController.updateDebugOptions`.

## Events & Narrative
- **Data:** `public/data/events.json`; validate with `npm run validate:events`.
- **Engine:** `src/game/events/*` (loader, mandatory registration, procedural selection). Mandatory events register at startup; optional events are depth/flag driven.
- **Docs:** See `docs/event-system.md` and quickstart/troubleshooting companions for schema and lifecycle.

## Economy
- **Currency:** `party.inventory.money` (initial 100). Vendors should respect this; adjust prices in item/vendor logic to match depth progression.
- **Vendors:** Tiles flag `vendor: true`; renderer billboards vendors. Buying/selling flows through inventory helpers—keep transactions atomic and update money and items together.

## Rendering & Assets
- **Renderer:** `src/graphics/renderer.ts` raycasts walls, tiles floor/ceiling textures, and anchors billboards to the floor. Billboard scaling is distance-aware to avoid giant sprites when far away.
- **Textures:** Depth-specific walls/floors (and optional alternates) under `public/assets/textures/depth*/`; global ceiling/overlay under `public/assets/textures/global/`.
- **Graphics Helpers:** Map utilities in `src/graphics/map.ts` mirror game tiles for rendering. Minimap lives in `src/graphics/minimap.ts`.

## Debug Tooling
- **UI Panel:** In `src/ui/app.ts` (debug section). Buttons for combat tests, boss spawn, depth skip, party HP=1, one-hit kill toggle, XP multiplier, encounter disable, and “Spawn debug entities nearby”.
- **Options:** `DebugOptions` in `src/game/state.ts`, mutated via `GameController.updateDebugOptions()`.
- **Event Testing:** `test-events.html` lets you load and test event data manually; `npm run validate:events` for CLI validation.

## Build, CI/CD, Deployment (recap)
- **Commands:** `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck`, `npm run validate:events`, `npm run ci`.
- **CI:** GitHub Actions run typecheck, build, event validation, and audit; auto-deploys to GitHub Pages on `main`. See `docs/ci-cd.md` and `docs/deployment.md`.

## Style & Data Integrity
- Keep systems deterministic (no runtime randomness in textures once assets exist).
- Update docs under `docs/event-system*.md` when changing event schema/flags.
- When touching saves (money, inventory, equipment, flags), note migration needs in PRs.
