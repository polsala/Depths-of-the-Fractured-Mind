import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "../src/game/index";
import { generateArchive } from "../src/game/exploration/generation/archive";
import { parseRun, serializeRun } from "../src/game/save";
import { getItemCount } from "../src/game/inventory";
import events from "../public/data/events.json";

beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => structuredClone(events) }))));
afterEach(() => vi.unstubAllGlobals());

async function fresh() {
  const controller = new GameController(130013);
  await vi.waitFor(() => expect(controller.isEventsLoaded()).toBe(true));
  controller.newGame(130013);
  controller.getState().mode = "exploration";
  const map = generateArchive(130013);
  controller.getState().depthMaps!.set(2, map);
  controller.getState().location = { depth: 2, x: map.startX, y: map.startY, direction: "north" };
  return controller;
}
function stand(controller: GameController, id: string) {
  const map = controller.getState().depthMaps!.get(2)!;
  const feature = map.environment!.rooms.flatMap((room) => room.featureRefs).find((feature) => feature.id === id)!;
  controller.getState().location = { depth: 2, x: feature.x, y: feature.y, direction: "north" };
  return map.tiles[feature.y][feature.x];
}

describe("Archive authoritative interactions", () => {
  it("does not turn unknown or prototype NPC IDs into a dialogue identity", async () => {
    const controller = await fresh();
    const state = controller.getState();
    const tile = state.depthMaps!.get(2)!.tiles[state.location.y][state.location.x];
    for (const id of ["archive-unknown", "constructor", "__proto__"]) {
      tile.npcId = id as typeof tile.npcId;
      expect(controller.getNearbyNpcId()).toBeNull();
      expect(controller.startDialogue()).toBe(false);
      expect(state.mode).toBe("exploration");
    }
  });
  it("accepts only a current or facing feature and releases the real evidence latch without consuming RNG", async () => {
    const controller = await fresh();
    const map = controller.getState().depthMaps!.get(2)!;
    expect(controller.getInteraction()).toBeNull();
    expect(controller.interact()).toBe(false);
    const before = controller.snapshot().randomState;
    const door = map.tiles.flat().find((tile) => tile.featureId === "archive-evidence-door")!;
    expect(door.locked).toBe(true);
    stand(controller, "archive-index");
    expect(controller.getInteraction()?.label).toMatch(/Release/);
    expect(controller.interact()).toBe(true);
    expect(door.locked).toBe(false);
    expect(controller.getState().flags.archiveIndexed).toBe(true);
    expect(controller.snapshot().randomState).toBe(before);
    controller.getState().mode = "event";
    expect(controller.interact()).toBe(false);
  });

  it("preserves an unopened cabinet at full capacity, then pays exactly once after reload", async () => {
    let controller = await fresh();
    const state = controller.getState();
    state.party.inventory.items = [];
    state.party.inventory.maxSlots = 0;
    const tile = stand(controller, "archive-secret");
    controller.interact();
    expect(tile.chest?.opened).toBe(false);
    expect(controller.getExplorationNotice()).toMatch(/full/);
    state.party.inventory.maxSlots = 20;
    controller.interact();
    expect(getItemCount(state.party.inventory, "medkit")).toBe(1);
    expect(tile.chest?.opened).toBe(true);
    const snapshot = parseRun(serializeRun(controller.snapshot()));
    controller = new GameController(1); controller.restore(snapshot);
    controller.interact();
    expect(getItemCount(controller.getState().party.inventory, "medkit")).toBe(1);
  });

  it("retains uncollected chest quantities across a partial collection and reload", async () => {
    let controller = await fresh();
    const inventory = controller.getState().party.inventory;
    inventory.items = []; inventory.maxSlots = 1;
    const tile = stand(controller, "archive-evidence");
    controller.interact();
    expect(tile.chest?.opened).toBe(false);
    expect(tile.chest?.loot).toEqual([{ itemId: "healing_potion", quantity: 2 }]);
    expect(getItemCount(inventory, "sanity_tonic")).toBe(2);
    const snapshot = parseRun(serializeRun(controller.snapshot()));
    controller = new GameController(1); controller.restore(snapshot);
    controller.getState().party.inventory.maxSlots = 2;
    controller.interact();
    expect(getItemCount(controller.getState().party.inventory, "sanity_tonic")).toBe(2);
    expect(getItemCount(controller.getState().party.inventory, "healing_potion")).toBe(2);
    controller.interact();
    expect(getItemCount(controller.getState().party.inventory, "healing_potion")).toBe(2);
  });

  it("uses the existing mandatory event IDs and never replays completed evidence", async () => {
    const controller = await fresh();
    stand(controller, "archive-recording");
    controller.interact();
    expect(controller.getState().currentEventId).toBe("riot_recording_event");
    expect(controller.getState().mode).toBe("event");
    controller.getState().mode = "exploration";
    controller.getState().flags.completedEventIds!.add("riot_recording_event");
    controller.interact();
    expect(controller.getState().mode).toBe("exploration");
    stand(controller, "archive-broken-floor");
    controller.interact();
    expect(controller.getState().currentEventId).toBe("pit_fall_event");
  });

  it("keeps geometry and accepted inspection identical for every living viewpoint and reduced sanity", async () => {
    const controller = await fresh();
    stand(controller, "archive-drum");
    const originalMap = JSON.stringify(controller.getState().depthMaps!.get(2));
    const rng = controller.snapshot().randomState;
    for (const sole of ["elias", "miriam", "subject13", "anya"]) {
      for (const person of controller.getState().party.members) {
        person.alive = person.id === sole; person.stats.hp = person.alive ? 1 : 0; person.stats.sanity = 0;
      }
      expect(controller.interact()).toBe(true);
      expect(controller.getExplorationNotice()).toMatch(/removed deliberately/);
      expect(JSON.stringify(controller.getState().depthMaps!.get(2))).toBe(originalMap);
      expect(controller.snapshot().randomState).toBe(rng);
    }
  });
});
