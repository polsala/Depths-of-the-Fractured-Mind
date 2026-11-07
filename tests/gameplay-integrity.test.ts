import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import eventData from "../public/data/events.json";
import { GameController } from "../src/game/index";
import { createInitialGameState, type GameState } from "../src/game/state";
import { createDefaultParty } from "../src/game/characters/party";
import { getCurrentDepthMap } from "../src/game/exploration/map";
import { moveBy } from "../src/game/exploration/movement";
import { addItem, getItemCount, removeItem } from "../src/game/inventory";
import { applyEventChoice, getChoiceUnavailableReason, getEventById, registerEvent, startEvent } from "../src/game/events/engine";
import { clearEventData, loadEventDataFile } from "../src/game/events/loader";
import { getAvailableEvents } from "../src/game/events/procedural";

function gameState(): GameState {
  const state = createInitialGameState();
  state.party = createDefaultParty();
  state.mode = "exploration";
  return state;
}

async function loadFixture(events: unknown[]): Promise<void> {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ version: "1", events }) })));
  await loadEventDataFile("/test-events.json");
}

beforeEach(() => {
  clearEventData();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ version: "1", events: [] }) })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("event integrity", () => {
  it("blocks a JSON choice without its required item, then grants rewards only once", async () => {
    await loadFixture(eventData.events);
    const state = gameState();
    state.location.depth = 2;
    const event = getEventById("locked_safe")!;
    const choice = event.choices.find((entry) => entry.id === "force_open")!;
    let active = startEvent(state, "locked_safe");

    expect(getChoiceUnavailableReason(choice, active)).toMatch(/crowbar/i);
    expect(applyEventChoice(active, "force_open")).toBe(active);
    expect(getItemCount(active.party.inventory, "access_card")).toBe(0);

    addItem(active.party.inventory, "crowbar");
    expect(getChoiceUnavailableReason(choice, active)).toBeNull();
    active = applyEventChoice(active, "force_open");
    expect(active.mode).toBe("exploration");
    expect(active.flags.completedEventIds?.has("locked_safe")).toBe(true);
    expect(getItemCount(active.party.inventory, "access_card")).toBe(1);
    expect(startEvent(active, "locked_safe")).toBe(active);
    expect(getAvailableEvents(active, ["locked_safe"])).toEqual([]);
    expect(applyEventChoice(active, "force_open")).toBe(active);
    expect(getItemCount(active.party.inventory, "access_card")).toBe(1);
  });

  it("enforces flags, sanity and items at the domain boundary", async () => {
    await loadFixture([{
      id: "gated_test", title: "Gate", description: "A test gate",
      choices: [{
        id: "open", label: "Open", requiresFlags: { gateOpen: true },
        requiresMinSanity: 8, requiresItems: ["crowbar"],
        effects: { setFlags: { gatePassed: true } },
      }],
      metadata: { id: "gated_test", category: "optional", repeatable: false },
    }]);
    let state = startEvent(gameState(), "gated_test");
    expect(applyEventChoice(state, "open")).toBe(state);
    state.flags.gateOpen = true;
    state.party.members[0].stats.sanity = 7;
    addItem(state.party.inventory, "crowbar");
    expect(applyEventChoice(state, "open")).toBe(state);
    state.party.members[0].stats.sanity = 8;
    state = applyEventChoice(state, "open");
    expect(state.flags.gatePassed).toBe(true);
    expect(state.flags.completedEventIds?.has("gated_test")).toBe(true);
  });

  it("keeps rewards and flags atomic when inventory cannot hold the whole reward", async () => {
    await loadFixture([{
      id: "reward_test", title: "Reward", description: "A test reward",
      choices: [{ id: "take", label: "Take", effects: {
        addItems: ["medkit", "sedative"], setFlags: { rewardClaimed: true },
      } }],
      metadata: { id: "reward_test", category: "optional", repeatable: false },
    }]);
    const state = gameState();
    state.party.inventory.maxSlots = 1;
    const active = startEvent(state, "reward_test");
    expect(getChoiceUnavailableReason(getEventById("reward_test")!.choices[0], active)).toMatch(/full/i);
    expect(applyEventChoice(active, "take")).toBe(active);
    expect(active.flags.rewardClaimed).toBeUndefined();
    expect(active.party.inventory.items).toEqual([]);
    expect(active.flags.completedEventIds?.has("reward_test")).toBe(false);
  });

  it("allows explicitly repeatable events to resolve again", () => {
    registerEvent({
      id: "repeatable_test", title: "Echo", description: "An echo", repeatable: true,
      choices: [{ id: "listen", label: "Listen", apply: (state) => ({
        ...state, flags: { ...state.flags, echoes: Number(state.flags.echoes ?? 0) + 1 },
      }) }],
    });
    let state = startEvent(gameState(), "repeatable_test");
    state = applyEventChoice(state, "listen");
    state = startEvent(state, "repeatable_test");
    state = applyEventChoice(state, "listen");
    expect(state.flags.echoes).toBe(2);
  });

  it("does not retrigger a completed event from a map tile", async () => {
    await loadFixture(eventData.events);
    const state = gameState();
    state.flags.completedEventIds?.add("locked_safe");
    const map = getCurrentDepthMap(state);
    const { x, y } = state.location;
    const direction = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .find(([dx, dy]) => map.tiles[y + dy]?.[x + dx]);
    if (!direction) throw new Error("Starting tile has no neighbor");
    const [dx, dy] = direction;
    const tile = map.tiles[y + dy][x + dx];
    tile.type = "floor";
    tile.passable = true;
    tile.eventId = "locked_safe";
    tile.encounterChance = undefined;
    const moved = moveBy(state, dx, dy);
    expect(moved.mode).toBe("exploration");
    expect(moved.currentEventId).toBeUndefined();
  });

  it("keeps an inventory-full event escapable without partial rewards", async () => {
    await loadFixture(eventData.events);
    const state = gameState();
    state.party.inventory.maxSlots = 0;
    const active = startEvent(state, "emergency_supplies");
    const event = getEventById("emergency_supplies")!;
    expect(getChoiceUnavailableReason(event.choices[0], active)).toMatch(/full/i);
    expect(getChoiceUnavailableReason(event.choices[2], active)).toBeNull();
    const resolved = applyEventChoice(active, "leave_supplies");
    expect(resolved.mode).toBe("exploration");
    expect(resolved.party.inventory.items).toHaveLength(0);
  });
});

describe("party defeat", () => {
  function placeAdjacentTrap(state: GameState, damage: number): () => void {
    const map = getCurrentDepthMap(state);
    const { x, y } = state.location;
    const directions = [
      { dx: 1, dy: 0, move: "moveEast" }, { dx: -1, dy: 0, move: "moveWest" },
      { dx: 0, dy: 1, move: "moveSouth" }, { dx: 0, dy: -1, move: "moveNorth" },
    ] as const;
    const direction = directions.find(({ dx, dy }) => map.tiles[y + dy]?.[x + dx]);
    if (!direction) throw new Error("Starting tile has no neighbor");
    const tile = map.tiles[y + direction.dy][x + direction.dx];
    tile.type = "floor";
    tile.passable = true;
    tile.trap = { id: "test_trap", name: "Test trap", description: "Lethal", detected: false, triggered: false, damage };
    tile.eventId = undefined;
    tile.encounterChance = undefined;
    return () => controllerMove(state, direction.move);
  }

  let controller: GameController;
  function controllerMove(_state: GameState, move: "moveEast" | "moveWest" | "moveSouth" | "moveNorth") {
    controller[move]();
  }

  it("routes an all-party trap death to Game Over exactly once and blocks further actions", () => {
    controller = new GameController();
    const state = controller.getState();
    state.mode = "exploration";
    state.party.members.forEach((member) => { member.stats.hp = 1; });
    addItem(state.party.inventory, "medkit");
    const move = placeAdjacentTrap(state, 10000);
    move();
    const fallen = controller.getState();
    expect(fallen.mode).toBe("gameover");
    expect(fallen.gameOverCause).toBe("trap");
    expect(fallen.party.members.every((member) => !member.alive)).toBe(true);
    const location = { ...fallen.location };
    move();
    controller.startEvent("pit_fall_event");
    controller.startCombat();
    expect(controller.useConsumableOutOfCombat("medkit", 0)).toBe(false);
    expect(controller.getState().location).toEqual(location);
    expect(controller.getState().gameOverCause).toBe("trap");
    expect(getItemCount(fallen.party.inventory, "medkit")).toBe(1);
    expect(moveBy(fallen, 1, 0)).toBe(fallen);
  });

  it("does not end the run when one member survives a trap", () => {
    controller = new GameController();
    const state = controller.getState();
    state.mode = "exploration";
    state.party.members.forEach((member, index) => { member.stats.hp = index === 0 ? 30 : 1; });
    placeAdjacentTrap(state, 10)();
    expect(controller.getState().mode).toBe("exploration");
    expect(controller.getState().party.members.filter((member) => member.alive)).toHaveLength(1);
  });

  it("routes lethal event effects to Game Over without following the event chain", async () => {
    await loadFixture([{
      id: "lethal_test", title: "End", description: "A fatal choice", nextEventId: "reward_test",
      choices: [{ id: "die", label: "Die", effects: { hpDelta: -10000 } }],
      metadata: { id: "lethal_test", category: "optional", repeatable: false },
    }]);
    const state = applyEventChoice(startEvent(gameState(), "lethal_test"), "die");
    expect(state.mode).toBe("gameover");
    expect(state.gameOverCause).toBe("event");
    expect(state.currentEventId).toBeUndefined();
    expect(applyEventChoice(state, "die")).toBe(state);
  });

  it("routes an event killing the final living character to Game Over", async () => {
    await loadFixture([{
      id: "last_survivor_test", title: "Last survivor", description: "A fatal choice",
      choices: [{ id: "sacrifice", label: "Sacrifice", effects: { killCharacter: "elias" } }],
      metadata: { id: "last_survivor_test", category: "optional", repeatable: false },
    }]);
    const state = gameState();
    state.party.members.slice(1).forEach((member) => { member.alive = false; member.stats.hp = 0; });
    const resolved = applyEventChoice(startEvent(state, "last_survivor_test"), "sacrifice");
    expect(resolved.mode).toBe("gameover");
    expect(resolved.gameOverCause).toBe("event");
  });

  it("syncs a combat defeat to the same Game Over state", () => {
    controller = new GameController();
    const state = controller.getState();
    state.mode = "exploration";
    controller.startCombat(false, 1);
    const combat = controller.getCombatState();
    expect(combat).toBeTruthy();
    combat.party.members.forEach((member: GameState["party"]["members"][number]) => {
      member.stats.hp = 0;
      member.alive = false;
    });
    combat.phase = "defeat";
    controller.endCombat();
    expect(controller.getState().mode).toBe("gameover");
    expect(controller.getState().gameOverCause).toBe("combat");
    expect(controller.getState().combatState).toBeUndefined();
    controller.triggerGameOver();
    expect(controller.getState().gameOverCause).toBe("combat");
  });

  it("ends combat immediately when a status tick kills the final survivor", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    controller = new GameController();
    const state = controller.getState();
    state.mode = "exploration";
    controller.startCombat(false, 1);
    const combat = controller.getCombatState();
    expect(combat).toBeTruthy();
    combat.party.members.forEach((member: GameState["party"]["members"][number], index: number) => {
      member.stats.hp = index === 0 ? 1 : 0;
      member.alive = index === 0;
    });
    combat.party.members[0].statusEffects.push("poisoned");
    combat.turnOrder = [
      { isPlayer: true, index: 0, speed: 10 },
      { isPlayer: false, index: 0, speed: 0 },
    ];
    combat.currentTurnIndex = 0;
    controller.submitCombatAction({ type: "defend", actorIndex: 0, isPlayerAction: true });
    expect(controller.getState().mode).toBe("gameover");
    expect(controller.getState().gameOverCause).toBe("combat");
  });

  it("does not mark a fled boss as defeated", () => {
    controller = new GameController();
    const state = controller.getState();
    state.mode = "exploration";
    controller.startCombat(true, 1);
    const combat = controller.getCombatState();
    expect(combat).toBeTruthy();
    combat.phase = "fled";
    controller.endCombat();
    expect(controller.getState().mode).toBe("exploration");
    expect(controller.getState().flags.bossDefeatedDepths?.has(1)).toBe(false);
  });
});

describe("consumable transactions", () => {
  it("never spends an antidote on a healthy target or a heal on a full/invalid target", () => {
    const controller = new GameController();
    const state = controller.getState();
    state.mode = "exploration";
    addItem(state.party.inventory, "antidote");
    addItem(state.party.inventory, "medkit");
    expect(controller.getConsumableUnavailableReason("antidote", 0)).toMatch(/not poisoned/i);
    expect(controller.useConsumableOutOfCombat("antidote", 0)).toBe(false);
    expect(controller.useConsumableOutOfCombat("medkit", 0)).toBe(false);
    expect(controller.useConsumableOutOfCombat("medkit", 999)).toBe(false);
    expect(getItemCount(state.party.inventory, "antidote")).toBe(1);
    expect(getItemCount(state.party.inventory, "medkit")).toBe(1);
    state.party.members[0].stats.hp -= 10;
    expect(controller.useConsumableOutOfCombat("medkit", 0)).toBe(true);
    expect(state.party.members[0].stats.hp).toBe(state.party.members[0].stats.maxHp);
    expect(getItemCount(state.party.inventory, "medkit")).toBe(0);
    state.party.members[0].statusEffects.push("poisoned");
    expect(controller.useConsumableOutOfCombat("antidote", 0)).toBe(true);
    expect(state.party.members[0].statusEffects).not.toContain("poisoned");
    expect(getItemCount(state.party.inventory, "antidote")).toBe(0);
  });

  it("blocks full-sanity use and applies a needed tonic exactly once", () => {
    const controller = new GameController();
    const state = controller.getState();
    state.mode = "exploration";
    addItem(state.party.inventory, "sanity_tonic");
    expect(controller.useConsumableOutOfCombat("sanity_tonic", 0)).toBe(false);
    state.party.members[0].stats.sanity -= 12;
    expect(controller.useConsumableOutOfCombat("sanity_tonic", 0)).toBe(true);
    expect(state.party.members[0].stats.sanity).toBe(state.party.members[0].stats.maxSanity);
    expect(getItemCount(state.party.inventory, "sanity_tonic")).toBe(0);
    expect(controller.useConsumableOutOfCombat("sanity_tonic", 0)).toBe(false);
  });

  it("does not remove a quantity the inventory does not have", () => {
    const inventory = gameState().party.inventory;
    addItem(inventory, "medkit");
    expect(removeItem(inventory, "medkit", 2)).toBe(false);
    expect(getItemCount(inventory, "medkit")).toBe(1);
  });
});
