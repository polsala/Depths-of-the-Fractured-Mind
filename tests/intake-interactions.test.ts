import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { GameController } from "../src/game/index";
import { parseRun, serializeRun, SAVE_VERSION } from "../src/game/save";
import { getCurrentActor } from "../src/game/combat/state";
import { getItemCount } from "../src/game/inventory";
import type { GameLocation } from "../src/game/state";
import events from "../public/data/events.json";

beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => structuredClone(events) }))));
afterEach(() => vi.unstubAllGlobals());

async function fresh(): Promise<GameController> {
  const controller = new GameController(130013);
  await vi.waitFor(() => expect(controller.isEventsLoaded()).toBe(true));
  controller.newGame(130013);
  controller.getState().mode = "exploration";
  return controller;
}

function stand(controller: GameController, x: number, y: number, direction: GameLocation["direction"]): void {
  controller.getState().location = { depth: 1, x, y, direction };
}

function checkpoint(controller: GameController): GameController {
  const restored = new GameController(1);
  restored.restore(parseRun(serializeRun(controller.snapshot())));
  return restored;
}

describe("intake interactions and persistence", () => {
  it("reads the wall counter from two cells away across a clear desk approach, without extending other interactions", async () => {
    const controller = await fresh();
    stand(controller, 4, 13, "north");
    expect(controller.getInteraction()?.id).toBe("intake-counter");
    expect(controller.interact()).toBe(true);
    expect(controller.getExplorationNotice()).toMatch(/Four arrivals/);
    stand(controller, 4, 13, "east");
    expect(controller.getInteraction()).toBeNull();
    stand(controller, 18, 8, "north");
    expect(controller.getInteraction()).toBeNull(); // Breaker two cells away.
    stand(controller, 4, 13, "north");
    const map = controller.getState().depthMaps!.get(1)!;
    map.tiles[12][4].passable = false;
    expect(controller.getInteraction()).toBeNull();
    map.tiles[12][4].passable = true;
    map.tiles[12][4].locked = true;
    expect(controller.getInteraction()).toBeNull();
    map.tiles[12][4] = undefined as any; // A missing intermediate tile is never transparent to interaction.
    expect(controller.getInteraction()).toBeNull();
  });

  it("commits quarter-turns without moving or advancing RNG and blocks them in incompatible modes", async () => {
    const controller = await fresh();
    const before = controller.snapshot().randomState;
    const location = { ...controller.getState().location };
    controller.turnLeft();
    expect(controller.getState().location).toEqual({ ...location, direction: "west" });
    controller.turnRight();
    expect(controller.getState().location).toEqual(location);
    for (let turn = 0; turn < 4; turn++) controller.turnRight();
    expect(controller.getState().location).toEqual(location);
    expect(controller.snapshot().randomState).toBe(before);
    for (const mode of ["title", "event", "conversation", "combat", "gameover"] as const) {
      controller.getState().mode = mode;
      controller.turnLeft();
      controller.turnRight();
      expect(controller.getState().location).toEqual(location);
    }
  });

  it("keeps the integer grid authoritative and opens a shutter once through a reachable breaker", async () => {
    let controller = await fresh();
    stand(controller, 12, 7, "north");
    const before = controller.snapshot().randomState;
    controller.moveForward();
    expect(controller.getState().location).toEqual({ depth: 1, x: 12, y: 7, direction: "north" });
    expect(controller.snapshot().randomState).toBe(before);
    expect(controller.getInteraction()?.id).toBe("release-shutter");
    controller.interact();
    expect(controller.getExplorationNotice()).toMatch(/OFF/);
    stand(controller, 18, 7, "north");
    expect(controller.getInteraction()?.id).toBe("release-breaker");
    controller.interact();
    const raw = JSON.parse(serializeRun(controller.snapshot()));
    expect(raw.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(2);
    controller = checkpoint(controller);
    expect(controller.getState().flags.intakePowerRestored).toBe(true);
    expect(controller.getState().depthMaps?.get(1)?.tiles[6][12].locked).toBe(false);
    stand(controller, 12, 7, "north");
    controller.moveForward();
    expect(controller.getState().location.y).toBe(6);
    expect(controller.getState().mode).toBe("exploration");
  });

  it("does not consume a secret when inventory is full or grant it twice across reload", async () => {
    let controller = await fresh();
    stand(controller, 18, 12, "north");
    controller.getState().party.inventory.maxSlots = 0;
    controller.interact();
    expect(controller.getState().flags.intakeLinenTaken).toBeUndefined();
    expect(controller.getExplorationNotice()).toMatch(/full/);
    controller.getState().party.inventory.maxSlots = 20;
    controller.interact();
    expect(getItemCount(controller.getState().party.inventory, "medkit")).toBe(1);
    controller = checkpoint(controller);
    controller.interact();
    expect(getItemCount(controller.getState().party.inventory, "medkit")).toBe(1);
    expect(controller.getState().flags.intakeLinenTaken).toBe(true);
  });

  it("resolves the real event and tactical fight, returns to exploration and pays off once", async () => {
    let controller = await fresh();
    stand(controller, 12, 4, "north");
    expect(controller.interact()).toBe(true);
    expect(controller.getState().mode).toBe("event");
    expect(controller.getState().currentEventId).toBe("first_corpse");
    expect(controller.interact()).toBe(false);
    controller.chooseEventChoice("examine_body");
    expect(controller.getState().mode).toBe("exploration");
    expect(controller.getState().flags.completedEventIds?.has("first_corpse")).toBe(true);
    expect(controller.getInteraction()?.label).toMatch(/Confront/);
    controller.interact();
    expect(controller.getState().mode).toBe("combat");
    expect(controller.getCombatState()?.encounter.enemies.map((enemy) => enemy.id)).toEqual(["deranged_guard", "corrupted_rat"]);
    for (let actions = 0; actions < 100 && controller.getCombatState()?.phase === "select-action"; actions++) {
      const combat = controller.getCombatState()!;
      const actor = getCurrentActor(combat)!;
      const targetIndex = combat.encounter.enemies.findIndex((enemy) => enemy.alive);
      controller.submitCombatAction({ type: "attack", actorIndex: actor.index, targetIndex, isPlayerAction: true });
    }
    expect(controller.getCombatState()?.phase).toBe("victory");
    controller.endCombat();
    expect(controller.getState().mode).toBe("exploration");
    expect(controller.getState().flags.intakeTagRecovered).toBe(true);
    controller = checkpoint(controller);
    stand(controller, 4, 12, "north");
    expect(controller.getInteraction()?.label).toMatch(/Return/);
    controller.interact();
    expect(controller.getState().flags.intakeComplete).toBe(true);
    expect(controller.getState().depthMaps?.get(1)?.tiles[14][2].type).toBe("stairsDown");
    const party = structuredClone(controller.getState().party);
    controller.interact();
    expect(controller.getState().party).toEqual(party);
    expect(controller.getExplorationNotice()).toMatch(/Mara Voss/i);
  });

  it("retains wounds and defeated enemies after retreat and reload", async () => {
    let controller = await fresh();
    controller.getState().flags.completedEventIds?.add("first_corpse");
    stand(controller, 12, 4, "north");
    controller.interact();
    controller.getCombatState()!.encounter.enemies[0].stats.hp = 7;
    controller.getCombatState()!.encounter.enemies[1].stats.hp = 0;
    controller.getCombatState()!.encounter.enemies[1].alive = false;
    controller.getCombatState()!.phase = "fled";
    controller.endCombat();
    expect(controller.getState().location).toEqual({ depth: 1, x: 12, y: 7, direction: "north" });
    controller = checkpoint(controller);
    stand(controller, 12, 4, "north");
    controller.interact();
    expect(controller.getCombatState()!.encounter.enemies[0].stats.hp).toBe(7);
    expect(controller.getCombatState()!.encounter.enemies[1].alive).toBe(false);
    expect(controller.getState().flags.intakeTagRecovered).toBeUndefined();
  });

  it("keeps a loaded v1 map and next roll untouched instead of replacing it with the intake", () => {
    const raw = readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8");
    const saved = parseRun(raw);
    const controller = new GameController(1);
    controller.restore(saved);
    expect(controller.getState().depthMaps?.get(1)?.layoutId).toBeUndefined();
    expect(controller.getState().depthMaps?.get(1)?.width).toBe(60);
    expect(controller.snapshot().randomState).toBe(JSON.parse(raw).randomState);
    expect(JSON.parse(serializeRun(controller.snapshot())).state).toEqual(JSON.parse(raw).state);
  });

  it("keeps required mechanisms and perception available when their usual speakers have fallen", async () => {
    const controller = await fresh();
    for (const member of controller.getState().party.members) {
      if (member.id !== "miriam") { member.alive = false; member.stats.hp = 0; }
    }
    stand(controller, 18, 7, "north");
    expect(controller.interact()).toBe(true);
    expect(controller.getExplorationNotice()).not.toMatch(/Elias recognizes/);
    stand(controller, 12, 11, "north");
    expect(controller.interact()).toBe(true);
    expect(controller.getExplorationNotice()).not.toMatch(/You wait with Subject 13|Anya counts/);
    controller.getState().flags.intakeTagRecovered = true;
    stand(controller, 4, 12, "north");
    controller.interact();
    expect(controller.getState().flags.intakeComplete).toBe(true);
    expect(controller.getState().party.members.filter((member) => member.alive).map((member) => member.id)).toEqual(["miriam"]);
  });

  it("rejects malformed authored dimensions and escaped encounter data before continuation", async () => {
    const controller = await fresh();
    const raw = JSON.parse(serializeRun(controller.snapshot()));
    raw.state.depthMaps[0][1].startX = 3;
    expect(() => parseRun(JSON.stringify(raw))).toThrow(/maps/);
    raw.state.depthMaps[0][1].startX = 4;
    raw.state.intakeEncounter = { enemies: [] };
    expect(() => parseRun(JSON.stringify(raw))).toThrow(/checkpoint/);
  });
});
