import type { GameLocation, GameState } from "../../game/state";
import type { MapTile } from "../../game/exploration/map";
import { getSanityStage } from "../../game/sanity";
import type { CharacterAnimation, ReferenceCharacter } from "../../assets/character-sprites";
import type { HeroAnimation } from "../../assets/hero-sprites";
import type { CharacterId } from "../../game/state";

export type Facing = NonNullable<GameLocation["direction"]>;
export type QualityPreset = "low" | "balanced" | "high";
export type DungeonWorldTile = Readonly<Pick<MapTile, "type" | "passable" | "locked" | "featureId" | "npcId" | "vendor" | "discovered"> & {
  chest?: Readonly<{ opened: boolean }>;
}>;
export interface DungeonWorldMap {
  readonly depth: number;
  readonly width: number;
  readonly height: number;
  readonly startX: number;
  readonly startY: number;
  readonly layoutId?: string;
  readonly tiles: readonly (readonly DungeonWorldTile[])[];
}
export interface DungeonPresentationSnapshot {
  readonly map: DungeonWorldMap;
  readonly location: Readonly<Required<GameLocation>>;
  readonly flags: Readonly<Record<string, boolean | number>>;
  readonly perception: "high" | "mid" | "low";
  readonly guardPresent: boolean;
  /** Isolated art-review fixture; presentDungeon never writes this field. */
  readonly characterPreview?: Readonly<{ id: ReferenceCharacter; animation: CharacterAnimation; elapsedMs: number }>;
  /** Isolated protagonist art fixture; never a party follower or collision object. */
  readonly heroPreview?: Readonly<{ id: CharacterId; animation: HeroAnimation; elapsedMs: number }>;
}

// This adapter reads already-created game data. It cannot create a map, roll
// gameplay RNG, resolve an interaction, or retain a mutable party reference.
export function presentDungeon(state: GameState): DungeonPresentationSnapshot {
  const map = state.depthMaps?.get(state.location.depth);
  if (!map) throw new Error("Current depth must exist before presentation");
  const witness = state.party.members.find((member) => member.id === "subject13" && member.alive) ?? state.party.members.find((member) => member.alive);
  const tiles = map.tiles.map((row) => Object.freeze(row.map((tile) => Object.freeze({
    type: tile.type, passable: tile.passable, locked: tile.locked, featureId: tile.featureId,
    npcId: tile.npcId, vendor: tile.vendor, discovered: tile.discovered,
    chest: tile.chest ? Object.freeze({ opened: tile.chest.opened === true }) : undefined,
  }))));
  return Object.freeze({
    map: Object.freeze({ ...map, tiles: Object.freeze(tiles) }),
    location: Object.freeze({ ...state.location, direction: state.location.direction ?? "north" }),
    flags: Object.freeze(Object.fromEntries(Object.entries(state.flags).filter((entry): entry is [string, boolean | number] =>
      typeof entry[1] === "boolean" || typeof entry[1] === "number"))),
    perception: witness ? getSanityStage(witness) : "high",
    guardPresent: map.layoutId === "depth1-intake-v1" && state.flags.intakeEncounterWon !== true
      && state.intakeEncounter?.enemies.find((enemy) => enemy.id === "deranged_guard")?.alive !== false,
  });
}
