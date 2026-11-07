import type { GameState, GameMode } from "./state";
import type { DepthMap } from "./exploration/map";

export const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";
export const SAVE_VERSION = 1;

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

function validateMap(value: unknown, depth: number): value is DepthMap {
  if (!record(value) || value.depth !== depth || !Number.isInteger(value.width) || !Number.isInteger(value.height)) return false;
  const width = value.width as number;
  const height = value.height as number;
  if (width < 1 || width > 200 || height < 1 || height > 200 || !Array.isArray(value.tiles) || value.tiles.length !== height) return false;
  if (!Number.isInteger(value.startX) || !Number.isInteger(value.startY) || (value.startX as number) < 0 || (value.startX as number) >= width || (value.startY as number) < 0 || (value.startY as number) >= height) return false;
  return value.tiles.every((row) => Array.isArray(row) && row.length === width && row.every((tile) =>
    record(tile) && ["wall", "floor", "stairsDown", "stairsUp", "door"].includes(String(tile.type)) && typeof tile.passable === "boolean"));
}

function validateState(value: unknown): asserts value is Record<string, unknown> {
  if (!record(value) || !record(value.location) || !record(value.party) || !record(value.flags)) throw new SaveFormatError("invalid", "The save is missing game state.");
  const { location, party, flags } = value;
  if (!Number.isInteger(location.depth) || (location.depth as number) < 1 || (location.depth as number) > 5 ||
      !Number.isInteger(location.x) || !Number.isInteger(location.y) ||
      !MODES.includes(value.mode as GameMode) || !Array.isArray(party.members) || party.members.length !== 4 ||
      !record(party.inventory) || !Array.isArray(party.inventory.items) || !record(flags.moral)) {
    throw new SaveFormatError("invalid", "The save contains invalid progression or party data.");
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
  validateState(parsed.state);
  if (!Number.isInteger(parsed.initialSeed) || (parsed.initialSeed as number) < 1 ||
      (parsed.initialSeed as number) > 0xffffffff ||
      !Number.isInteger(parsed.randomState) || (parsed.randomState as number) < 1 ||
      (parsed.randomState as number) > 0xffffffff || !Number.isInteger(parsed.stepsSinceLastEvent) ||
      (parsed.stepsSinceLastEvent as number) < 0 ||
      !(parsed.lastProceduralEventId === null || typeof parsed.lastProceduralEventId === "string")) {
    throw new SaveFormatError("invalid", "The save contains invalid random or event state.");
  }
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
