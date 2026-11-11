import type { GameState, GameMode, FinalDecision } from "./state";
import type { DepthMap } from "./exploration/map";
import { isArchiveEnvironment } from "./exploration/generation/validate";
import { resolveEnding } from "./endings";

export const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";
// v3 adds an explicit opt-in generation policy and semantic Archive identity.
// Missing policy in v0/v1/v2 and legacy re-saves retains original map/RNG behavior.
export const SAVE_VERSION = 3;

export interface RunSnapshot {
  state: GameState;
  initialSeed: number;
  randomState: number;
  stepsSinceLastEvent: number;
  lastProceduralEventId: string | null;
  savedAt: string;
}

export type SaveReadResult =
  | { kind: "empty" }
  | { kind: "ready"; snapshot: RunSnapshot }
  | { kind: "invalid"; message: string }
  | { kind: "incompatible"; message: string };

export class SaveFormatError extends Error {
  readonly kind: "invalid" | "incompatible";
  constructor(kind: "invalid" | "incompatible", message: string) {
    super(message);
    this.kind = kind;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

const MODES: GameMode[] = ["title", "exploration", "combat", "event", "conversation", "ending", "gameover", "pause"];
const FINAL_DECISIONS: FinalDecision[] = ["broadcast", "evacuate", "seal", "bind", "witness"];

function validateMap(value: unknown, depth: number): value is DepthMap {
  if (!record(value) || value.depth !== depth || !Number.isInteger(value.width) || !Number.isInteger(value.height)) return false;
  const width = value.width as number;
  const height = value.height as number;
  if (width < 1 || width > 200 || height < 1 || height > 200 || !Array.isArray(value.tiles) || value.tiles.length !== height) return false;
  if (!Number.isInteger(value.startX) || !Number.isInteger(value.startY) || (value.startX as number) < 0 || (value.startX as number) >= width || (value.startY as number) < 0 || (value.startY as number) >= height) return false;
  if (value.layoutId !== undefined && (value.layoutId !== "depth1-intake-v1" || depth !== 1 || width !== 22 || height !== 20 || value.startX !== 4 || value.startY !== 15)) return false;
  if (value.environment !== undefined && (depth !== 2 || !isArchiveEnvironment(value.environment, width, height))) return false;
  const validTiles = value.tiles.every((row) => Array.isArray(row) && row.length === width && row.every((tile) =>
    record(tile) && ["wall", "floor", "stairsDown", "stairsUp", "door"].includes(String(tile.type)) && typeof tile.passable === "boolean" &&
    (tile.featureId === undefined || typeof tile.featureId === "string") && (tile.locked === undefined || typeof tile.locked === "boolean")));
  if (!validTiles) return false;
  if (value.environment !== undefined) {
    const map=value as unknown as DepthMap;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
      const tile=map.tiles[y][x];
      if(tile.featureId?.startsWith("archive-shelving-") && (tile.passable || !map.environment!.rooms.some(room=>room.archetype==="compressed-aisle" && x>=room.x && y>=room.y && x<room.x+room.width && y<room.y+room.height)))return false;
    }
  }
  return true;
}

function validateState(value: unknown): asserts value is Record<string, unknown> {
  if (!record(value) || !record(value.location) || !record(value.party) || !record(value.flags)) throw new SaveFormatError("invalid", "The save is missing game state.");
  const { location, party, flags } = value;
  if (value.generationPolicy !== undefined && (!record(value.generationPolicy) || value.generationPolicy.version !== 1 || !Number.isInteger(value.generationPolicy.runSeed) || (value.generationPolicy.runSeed as number)<1 || (value.generationPolicy.runSeed as number)>0xffffffff)) throw new SaveFormatError("invalid", "Unsupported world generation policy.");
  if (value.explorationNotice !== undefined && typeof value.explorationNotice !== "string") throw new SaveFormatError("invalid", "The exploration notice is invalid.");
  if (value.intakeEncounter !== undefined && (!record(value.intakeEncounter) || !Array.isArray(value.intakeEncounter.enemies) ||
      value.intakeEncounter.enemies.length < 1 || value.intakeEncounter.enemies.length > 3 || !value.intakeEncounter.enemies.every((enemy) => record(enemy) &&
        ["deranged_guard", "corrupted_rat"].includes(String(enemy.id)) && typeof enemy.name === "string" && record(enemy.stats) &&
        ["hp", "maxHp", "sanity", "maxSanity", "attack", "defense", "will", "focus"].every((key) => finite((enemy.stats as Record<string, unknown>)[key])) &&
        (enemy.stats.hp as number) >= 0 && (enemy.stats.maxHp as number) > 0 && (enemy.stats.hp as number) <= (enemy.stats.maxHp as number) &&
        typeof enemy.alive === "boolean" && stringArray(enemy.statusEffects)))) {
    throw new SaveFormatError("invalid", "The intake encounter checkpoint is invalid.");
  }
  if (!Number.isInteger(location.depth) || (location.depth as number) < 1 || (location.depth as number) > 5 ||
      !Number.isInteger(location.x) || !Number.isInteger(location.y) ||
      !MODES.includes(value.mode as GameMode) || !Array.isArray(party.members) || party.members.length !== 4 ||
      !record(party.inventory) || !Array.isArray(party.inventory.items) || !record(flags.moral)) {
    throw new SaveFormatError("invalid", "The save contains invalid progression or party data.");
  }
  const moral = flags.moral as Record<string, unknown>;
  if (["mercy", "cruelty", "truth", "denial"].some((key) => !finite(moral[key]) || (moral[key] as number) < 0)) {
    throw new SaveFormatError("invalid", "The save contains invalid moral scores.");
  }
  if (value.mode === "title") throw new SaveFormatError("invalid", "A title screen is not a saved run.");
  if (!party.members.every((member) => record(member) && record(member.stats) &&
      ["elias", "miriam", "subject13", "anya"].includes(String(member.id)) &&
      finite(member.stats.hp) && finite(member.stats.maxHp) && finite(member.stats.sanity) &&
      typeof member.alive === "boolean" && stringArray(member.statusEffects))) {
    throw new SaveFormatError("invalid", "The save contains invalid characters.");
  }
  if (!party.inventory.items.every((entry) => record(entry) && record(entry.item) && typeof entry.item.id === "string" &&
      Number.isInteger(entry.quantity) && (entry.quantity as number) > 0) || !finite(party.inventory.money)) {
    throw new SaveFormatError("invalid", "The save contains an invalid inventory.");
  }
  if (!stringArray(flags.visitedTiles) || !stringArray(flags.completedEventIds) ||
      !Array.isArray(flags.bossDefeatedDepths) || !flags.bossDefeatedDepths.every((depth) => Number.isInteger(depth) && depth >= 1 && depth <= 5)) {
    throw new SaveFormatError("invalid", "The save contains invalid event flags.");
  }
  if (!Array.isArray(value.depthMaps) || value.depthMaps.length < 1 || value.depthMaps.length > 5 ||
      !value.depthMaps.every((entry) => Array.isArray(entry) && entry.length === 2 && Number.isInteger(entry[0]) &&
        entry[0] >= 1 && entry[0] <= 5 && validateMap(entry[1], entry[0]))) {
    throw new SaveFormatError("invalid", "The save contains invalid maps.");
  }
  const mapEntry = value.depthMaps.find((entry: unknown) => Array.isArray(entry) && entry[0] === location.depth) as [number, DepthMap] | undefined;
  if (!mapEntry || (location.x as number) < 0 || (location.x as number) >= mapEntry[1].width ||
      (location.y as number) < 0 || (location.y as number) >= mapEntry[1].height) {
    throw new SaveFormatError("invalid", "The saved position is outside the map.");
  }
  if (value.mode === "event" && typeof value.currentEventId !== "string") throw new SaveFormatError("invalid", "The event is missing.");
  if (value.mode === "conversation" && typeof value.currentDialogueId !== "string") throw new SaveFormatError("invalid", "The dialogue is missing.");
  if (value.finalDecision !== undefined && !FINAL_DECISIONS.includes(value.finalDecision as FinalDecision)) {
    throw new SaveFormatError("invalid", "The final decision is invalid.");
  }
  if (value.finalDecision !== undefined && value.mode !== "ending") {
    throw new SaveFormatError("invalid", "The final decision is outside the ending.");
  }
  if (value.mode === "ending" && (location.depth !== 5 || !flags.bossDefeatedDepths.includes(5) ||
      !party.members.some((member) => record(member) && member.alive && record(member.stats) && finite(member.stats.hp) && member.stats.hp > 0))) {
    throw new SaveFormatError("invalid", "The ending is missing its final victory.");
  }
  if (value.mode === "combat" && (!record(value.combatState) || !record(value.combatState.encounter) ||
      !Array.isArray(value.combatState.encounter.enemies) || !Array.isArray(value.combatState.turnOrder) ||
      !stringArray(value.combatState.shownLowHealthDialogues) ||
      !["select-action", "victory", "defeat", "fled"].includes(String(value.combatState.phase)))) {
    throw new SaveFormatError("invalid", "The combat checkpoint is invalid.");
  }
}

export function serializeRun(snapshot: RunSnapshot): string {
  const { state } = snapshot;
  return JSON.stringify({
    version: SAVE_VERSION,
    savedAt: snapshot.savedAt,
    initialSeed: snapshot.initialSeed,
    randomState: snapshot.randomState,
    stepsSinceLastEvent: snapshot.stepsSinceLastEvent,
    lastProceduralEventId: snapshot.lastProceduralEventId,
    state: {
      ...state,
      flags: {
        ...state.flags,
        visitedTiles: [...(state.flags.visitedTiles ?? [])],
        completedEventIds: [...(state.flags.completedEventIds ?? [])],
        bossDefeatedDepths: [...(state.flags.bossDefeatedDepths ?? [])],
      },
      depthMaps: [...(state.depthMaps ?? new Map<number, DepthMap>())],
    },
  });
}

export function parseRun(raw: string): RunSnapshot {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new SaveFormatError("invalid", "The save is not valid JSON."); }
  if (!record(parsed) || !Number.isInteger(parsed.version)) throw new SaveFormatError("invalid", "The save has no valid version.");
  const version = parsed.version as number;
  if (version > SAVE_VERSION) throw new SaveFormatError("incompatible", "This save was made by a newer game version. Export it before changing games.");
  if (version < 0) throw new SaveFormatError("incompatible", "This save version is unsupported.");

  // Version 0 was an internal pre-release snapshot without completion tracking.
  if (version === 0 && record(parsed.state) && record(parsed.state.flags)) {
    parsed.state.flags.completedEventIds ??= [];
    if (record(parsed.state.combatState)) parsed.state.combatState.shownLowHealthDialogues ??= [];
    parsed.randomState ??= 0x6d2b79f5;
    parsed.initialSeed ??= parsed.randomState;
    parsed.stepsSinceLastEvent ??= 0;
    parsed.lastProceduralEventId ??= null;
  }
  if (version < 3 && record(parsed.state)) delete parsed.state.generationPolicy;
  validateState(parsed.state);
  if (!Number.isInteger(parsed.initialSeed) || (parsed.initialSeed as number) < 1 ||
      (parsed.initialSeed as number) > 0xffffffff ||
      !Number.isInteger(parsed.randomState) || (parsed.randomState as number) < 1 ||
      (parsed.randomState as number) > 0xffffffff || !Number.isInteger(parsed.stepsSinceLastEvent) ||
      (parsed.stepsSinceLastEvent as number) < 0 ||
      !(parsed.lastProceduralEventId === null || typeof parsed.lastProceduralEventId === "string")) {
    throw new SaveFormatError("invalid", "The save contains invalid random or event state.");
  }
  if (record(parsed.state.generationPolicy) && parsed.state.generationPolicy.runSeed !== parsed.initialSeed) throw new SaveFormatError("invalid", "Generation seed does not match the run.");
  const state = parsed.state as unknown as GameState & { flags: GameState["flags"] & {
    visitedTiles: string[]; completedEventIds: string[]; bossDefeatedDepths: number[];
  }; depthMaps: [number, DepthMap][] };
  const restored: GameState = {
    ...state,
    flags: {
      ...state.flags,
      visitedTiles: new Set(state.flags.visitedTiles),
      completedEventIds: new Set(state.flags.completedEventIds),
      bossDefeatedDepths: new Set(state.flags.bossDefeatedDepths),
    },
    depthMaps: new Map(state.depthMaps),
  };
  if (restored.combatState) restored.combatState.party = restored.party;
  if (restored.mode === "ending" && restored.finalDecision && !resolveEnding(restored)) {
    throw new SaveFormatError("invalid", "The saved ending does not match the run's choices.");
  }
  return {
    state: restored,
    initialSeed: parsed.initialSeed as number,
    randomState: parsed.randomState as number,
    stepsSinceLastEvent: parsed.stepsSinceLastEvent as number,
    lastProceduralEventId: parsed.lastProceduralEventId as string | null,
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date(0).toISOString(),
  };
}

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveRepository {
  private readonly storage: SaveStorage;
  constructor(storage: SaveStorage) { this.storage = storage; }

  read(): SaveReadResult {
    let raw: string | null;
    try { raw = this.storage.getItem(SAVE_KEY); }
    catch { return { kind: "invalid", message: "Browser storage is unavailable." }; }
    if (raw === null) return { kind: "empty" };
    try { return { kind: "ready", snapshot: parseRun(raw) }; }
    catch (error) {
      if (error instanceof SaveFormatError) return { kind: error.kind, message: error.message };
      return { kind: "invalid", message: "The save could not be read." };
    }
  }

  write(snapshot: RunSnapshot): string | null {
    try { this.storage.setItem(SAVE_KEY, serializeRun(snapshot)); return null; }
    catch { return "Could not save the run. Browser storage may be full or disabled."; }
  }

  import(raw: string): RunSnapshot {
    const snapshot = parseRun(raw); // Validate before touching the existing save.
    this.storage.setItem(SAVE_KEY, serializeRun(snapshot));
    return snapshot;
  }

  clear(): void { this.storage.removeItem(SAVE_KEY); }

  exportRaw(): string | null { return this.storage.getItem(SAVE_KEY); }
}
