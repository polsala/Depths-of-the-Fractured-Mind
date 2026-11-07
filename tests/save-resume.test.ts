import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GameController } from "../src/game/index";
import { getDepthMap } from "../src/game/exploration/map";
import { addItem, getItemCount } from "../src/game/inventory";
import { gameRandom } from "../src/game/random";
import { parseRun, SaveFormatError, SaveRepository, SAVE_KEY, serializeRun, type SaveStorage } from "../src/game/save";

class MemoryStorage implements SaveStorage {
  private entries = new Map<string, string>();
  getItem(key: string): string | null { return this.entries.get(key) ?? null; }
  setItem(key: string, value: string): void { this.entries.set(key, value); }
  removeItem(key: string): void { this.entries.delete(key); }
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ version: "1", events: [] }) })));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("versioned run saves", () => {
  it("restores party, inventory, map mutations, fog, event flags and RNG without regenerating a depth", () => {
    const first = new GameController();
    const state = first.getState();
    state.mode = "exploration";
    state.party.members[0].stats.hp = 11;
    state.party.members[0].equipment = { weapon: "warden_baton" };
    state.party.inventory.money = 37;
    addItem(state.party.inventory, "medkit", 2);
    state.flags.completedEventIds?.add("pit_fall_event");
    state.flags.visitedTiles?.add("2-4-5");
    state.flags.bossDefeatedDepths?.add(1);
    const depthTwo = getDepthMap(2, state.depthMaps);
    state.location = { depth: 2, x: depthTwo.startX, y: depthTwo.startY, direction: "west" };
    depthTwo.tiles[depthTwo.startY][depthTwo.startX].discovered = true;
    depthTwo.tiles[depthTwo.startY][depthTwo.startX].itemId = "torch";

    const raw = serializeRun(first.snapshot());
    const nextRoll = gameRandom();
    const resumed = new GameController();
    resumed.restore(parseRun(raw));
    const current = resumed.getState();
    expect(current.location).toEqual(state.location);
    expect(current.party.members[0].stats.hp).toBe(11);
    expect(current.party.members[0].equipment?.weapon).toBe("warden_baton");
    expect(current.party.inventory.money).toBe(37);
    expect(getItemCount(current.party.inventory, "medkit")).toBe(2);
    expect(current.flags.completedEventIds?.has("pit_fall_event")).toBe(true);
    expect(current.flags.visitedTiles?.has("2-4-5")).toBe(true);
    expect(current.flags.bossDefeatedDepths?.has(1)).toBe(true);
    expect(current.depthMaps?.get(2)?.tiles[depthTwo.startY][depthTwo.startX].itemId).toBe("torch");
    expect(gameRandom()).toBe(nextRoll);
  });

  it("resumes an event and an active combat with the same shared party and boss cue state", () => {
    const controller = new GameController();
    const state = controller.getState();
    state.mode = "event";
    state.currentEventId = "pit_fall_event";
    const event = parseRun(serializeRun(controller.snapshot()));
    expect(event.state.mode).toBe("event");
    expect(event.state.currentEventId).toBe("pit_fall_event");

    state.mode = "exploration";
    state.currentEventId = undefined;
    controller.startCombat(true, 1);
    const combat = controller.getCombatState();
    expect(combat).toBeDefined();
    combat!.encounter.enemies[0].stats.hp = 2;
    combat!.shownLowHealthDialogues.push(combat!.encounter.enemies[0].id);
    const resumed = new GameController();
    resumed.restore(parseRun(serializeRun(controller.snapshot())));
    expect(resumed.getState().mode).toBe("combat");
    expect(resumed.getCombatState()?.party).toBe(resumed.getState().party);
    expect(resumed.getCombatState()?.encounter.enemies[0].stats.hp).toBe(2);
    expect(resumed.getCombatState()?.shownLowHealthDialogues).toEqual(combat!.shownLowHealthDialogues);
    resumed.getCombatState()!.phase = "victory";
    resumed.endCombat();
    expect(resumed.getState().mode).toBe("exploration");
    expect(resumed.getState().flags.bossDefeatedDepths?.has(1)).toBe(true);
    const afterFight = new GameController();
    afterFight.restore(parseRun(serializeRun(resumed.snapshot())));
    expect(afterFight.getState().flags.bossDefeatedDepths?.has(1)).toBe(true);
    expect(afterFight.getState().combatState).toBeUndefined();
  });

  it("persists the consequence of an event choice without replaying it on resume", () => {
    const controller = new GameController();
    controller.getState().mode = "exploration";
    controller.startEvent("pit_fall_event");
    expect(controller.getState().mode).toBe("event");
    controller.chooseEventChoice("abandon");
    const moral = { ...controller.getState().flags.moral };
    const resumed = new GameController();
    resumed.restore(parseRun(serializeRun(controller.snapshot())));
    expect(resumed.getState().mode).toBe("exploration");
    expect(resumed.getState().flags.pitEventResolved).toBe(true);
    expect(resumed.getState().flags.moral).toEqual(moral);
    resumed.chooseEventChoice("abandon");
    expect(resumed.getState().flags.moral).toEqual(moral);
  });

  it("rejects corrupt and future saves without overwriting the existing run", () => {
    const storage = new MemoryStorage();
    const repository = new SaveRepository(storage);
    const controller = new GameController();
    controller.getState().mode = "exploration";
    expect(repository.write(controller.snapshot())).toBeNull();
    const original = storage.getItem(SAVE_KEY);
    expect(() => repository.import("{broken")).toThrow(SaveFormatError);
    expect(storage.getItem(SAVE_KEY)).toBe(original);
    const future = JSON.stringify({ ...JSON.parse(original!), version: 99 });
    expect(() => repository.import(future)).toThrow(/newer game version/);
    expect(storage.getItem(SAVE_KEY)).toBe(original);
    storage.setItem(SAVE_KEY, "{broken");
    expect(repository.read().kind).toBe("invalid");
    storage.setItem(SAVE_KEY, future);
    expect(repository.read().kind).toBe("incompatible");
  });

  it("migrates a pre-release v0 snapshot and keeps deletion explicit", () => {
    const storage = new MemoryStorage();
    const repository = new SaveRepository(storage);
    const controller = new GameController();
    controller.getState().mode = "exploration";
    const legacy = JSON.parse(serializeRun(controller.snapshot()));
    legacy.version = 0;
    delete legacy.randomState;
    delete legacy.initialSeed;
    delete legacy.state.flags.completedEventIds;
    const migrated = repository.import(JSON.stringify(legacy));
    expect(migrated.state.flags.completedEventIds).toEqual(new Set());
    expect(migrated.randomState).toBeGreaterThan(0);
    expect(repository.read().kind).toBe("ready");
    repository.clear();
    expect(repository.read().kind).toBe("empty");
  });
});
