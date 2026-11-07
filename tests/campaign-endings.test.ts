import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import eventData from "../public/data/events.json";
import { GameController } from "../src/game/index";
import { clearEventData } from "../src/game/events/loader";
import { getEventById, getChoiceUnavailableReason } from "../src/game/events/engine";
import { getDepthMap } from "../src/game/exploration/map";
import { resolveDownStairs } from "../src/game/exploration/movement";
import { getEndingOptions, resolveEnding } from "../src/game/endings";
import { addItem } from "../src/game/inventory";
import { getCurrentObjective } from "../src/game/objectives";
import { parseRun, serializeRun } from "../src/game/save";
import type { FinalDecision } from "../src/game/state";

beforeEach(() => {
  clearEventData();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => structuredClone(eventData) })));
});
afterEach(() => vi.unstubAllGlobals());

async function fresh(seed = 33): Promise<GameController> {
  const controller = new GameController(seed);
  await vi.waitFor(() => expect(controller.isEventsLoaded()).toBe(true));
  controller.getState().mode = "exploration";
  return controller;
}

function putByDownStair(controller: GameController, depth: number): () => void {
  const state = controller.getState();
  const map = getDepthMap(depth, state.depthMaps);
  const y = map.tiles.findIndex((row) => row.some((tile) => tile.type === "stairsDown"));
  const x = map.tiles[y].findIndex((tile) => tile.type === "stairsDown");
  const sides = [
    { dx: 1, dy: 0, move: () => controller.moveWest() },
    { dx: -1, dy: 0, move: () => controller.moveEast() },
    { dx: 0, dy: 1, move: () => controller.moveNorth() },
    { dx: 0, dy: -1, move: () => controller.moveSouth() },
  ];
  const side = sides.find(({ dx, dy }) => map.tiles[y + dy]?.[x + dx]?.passable);
  if (!side) throw new Error("No approach to the final stair");
  state.location = { depth, x: x + side.dx, y: y + side.dy, direction: "north" };
  return side.move;
}

function primeFinale(controller: GameController): void {
  const state = controller.getState();
  state.location.depth = 5;
  getDepthMap(5, state.depthMaps);
  state.flags.bossDefeatedDepths?.add(5);
  state.mode = "ending";
}

describe("campaign conclusion", () => {
  it("starts the Engine Heart fight at the final stair, then offers a choice without retriggering", async () => {
    const controller = await fresh();
    const step = putByDownStair(controller, 5);
    step();
    expect(controller.getState().mode).toBe("combat");
    expect(controller.getCombatState()?.isBossFight).toBe(true);
    expect(controller.getCombatState()?.encounter.enemies[0].id).toBe("the_engine_heart");
    controller.getCombatState()!.phase = "victory";
    controller.endCombat();
    expect(controller.getState().mode).toBe("ending");
    expect(controller.getState().flags.bossDefeatedDepths?.has(5)).toBe(true);
    expect(controller.getCombatState()).toBeUndefined();
    expect(resolveEnding(controller.getState())).toBeNull();
    expect(controller.chooseEnding("seal")).toBe(true);
    expect(resolveEnding(controller.getState())?.id).toBe("seal");
    expect(controller.chooseEnding("bind")).toBe(false);
    // An older victory checkpoint on the stair must lead to the choice, not a second boss.
    expect(resolveDownStairs({ ...controller.getState(), mode: "exploration", finalDecision: undefined }).mode).toBe("ending");
  });

  it("never enters an ending after final boss defeat", async () => {
    const controller = await fresh(44);
    putByDownStair(controller, 5)();
    const combat = controller.getCombatState()!;
    combat.party.members.forEach((member) => { member.alive = false; member.stats.hp = 0; });
    combat.phase = "defeat";
    controller.endCombat();
    expect(controller.getState().mode).toBe("gameover");
    expect(controller.getState().flags.bossDefeatedDepths?.has(5)).toBe(false);

    const simultaneous = await fresh(44);
    putByDownStair(simultaneous, 5)();
    simultaneous.getCombatState()!.party.members.forEach((member) => { member.alive = false; member.stats.hp = 0; });
    simultaneous.getCombatState()!.phase = "victory";
    simultaneous.endCombat();
    expect(simultaneous.getState().mode).toBe("gameover");
    expect(simultaneous.getState().flags.bossDefeatedDepths?.has(5)).toBe(false);
  });

  it("makes four ordinary endings and one hidden ending independently reachable", async () => {
    const cases: Array<{ id: FinalDecision; prepare: (controller: GameController) => void }> = [
      { id: "broadcast", prepare: (controller) => {
        const state = controller.getState();
        state.flags.riotRecordingPlayed = true;
        state.flags.confessionalUsed = true;
        state.flags.moral.truth = 3;
      } },
      { id: "evacuate", prepare: (controller) => {
        const state = controller.getState();
        state.flags.wardPatientSaved = true;
        state.flags.moral.mercy = 3;
      } },
      { id: "seal", prepare: () => {} },
      { id: "bind", prepare: () => {} },
      { id: "witness", prepare: (controller) => {
        const state = controller.getState();
        state.flags.riotRecordingPlayed = true;
        state.flags.completedEventIds?.add("first_corpse");
        state.flags.pitEventResolved = true;
        state.flags.overflowWardResolved = true;
        state.flags.confessionalUsed = true;
        state.flags.keeperLeadFollowed = true;
        state.flags.wardPatientSaved = true;
        state.flags.eliasSeekingRedemption = true;
        state.flags.anyaSeeksRedemption = true;
        state.flags.moral.truth = 8;
        state.flags.moral.mercy = 6;
        expect(addItem(state.party.inventory, "staff_memo")).toBe(true);
      } },
    ];
    for (const { id, prepare } of cases) {
      const controller = await fresh();
      primeFinale(controller);
      prepare(controller);
      expect(getEndingOptions(controller.getState()).find((option) => option.id === id)?.unavailableReason).toBeNull();
      expect(controller.chooseEnding(id)).toBe(true);
      const result = resolveEnding(controller.getState());
      expect(result?.id).toBe(id);
      expect(result?.survivors).toHaveLength(4);
      expect(result?.consequences).toHaveLength(4);
    }
  });

  it("locks evidence-dependent endings when the moral record contradicts them", async () => {
    const controller = await fresh();
    primeFinale(controller);
    expect(getEndingOptions(controller.getState()).map((option) => option.id)).not.toContain("witness");
    expect(controller.chooseEnding("broadcast")).toBe(false);
    expect(controller.chooseEnding("evacuate")).toBe(false);
    expect(controller.chooseEnding("witness")).toBe(false);
    expect(controller.getState().finalDecision).toBeUndefined();
  });

  it("unlocks the hidden route through actual dialogue and event choices", async () => {
    const controller = await fresh(73);
    expect(controller.startDialogue()).toBe(true);
    expect(controller.chooseDialogueChoice("listen")).toBe(true);
    controller.advanceDialogue();
    const play = (depth: number, eventId: string, choiceId: string) => {
      controller.getState().location.depth = depth;
      controller.startEvent(eventId);
      expect(controller.getState().mode).toBe("event");
      controller.chooseEventChoice(choiceId);
      expect(controller.getState().flags.completedEventIds?.has(eventId)).toBe(true);
    };
    play(1, "first_corpse", "pay_respects");
    play(2, "riot_recording_event", "admit_responsibility");
    play(2, "pit_fall_event", "careful_rescue");
    play(2, "director_office", "follow_keepers_clue");
    play(3, "overflow_ward_event", "try_stabilize");
    play(4, "confessional_chair_event", "listen_confess");
    primeFinale(controller);
    expect(getEndingOptions(controller.getState()).map((option) => option.id)).toContain("witness");
    expect(controller.chooseEnding("witness")).toBe(true);
    expect(resolveEnding(controller.getState())?.title).toBe("The Unbroken Witness");
  });

  it("persists an epilogue, rejects forged outcomes, and can start a new run", async () => {
    const controller = await fresh();
    primeFinale(controller);
    controller.chooseEnding("bind");
    const restored = await fresh(90);
    restored.restore(parseRun(serializeRun(controller.snapshot())));
    expect(restored.getState().mode).toBe("ending");
    expect(resolveEnding(restored.getState())?.title).toBe("Inheritance");
    const forged = JSON.parse(serializeRun(controller.snapshot()));
    forged.state.finalDecision = "witness";
    expect(() => parseRun(JSON.stringify(forged))).toThrow();
    restored.newGame(91);
    expect(restored.getState().finalDecision).toBeUndefined();
    expect(restored.getState().flags.bossDefeatedDepths?.size).toBe(0);
  });
});

describe("guided first depth", () => {
  it("explains the opening, guarantees first evidence and reacts to its consequence", async () => {
    const controller = await fresh(45);
    expect(getCurrentObjective(controller.getState()).title).toMatch(/witness/i);
    expect(getCurrentObjective(controller.getState()).guidance).toMatch(/red downward stair/i);
    controller.startDialogue();
    controller.chooseDialogueChoice("listen");
    controller.advanceDialogue();
    expect(getCurrentObjective(controller.getState()).title).toMatch(/First Body/i);
    putByDownStair(controller, 1)();
    expect(controller.getState().currentEventId).toBe("first_corpse");
    controller.chooseEventChoice("pay_respects");
    expect(controller.getState().mode).toBe("combat");
    expect(getCurrentObjective(controller.getState()).consequence).toMatch(/mercy/i);
  });

  it("has a scripted no-debug path through its event and real guardian fight", async () => {
    const controller = await fresh(17);
    controller.startDialogue();
    controller.chooseDialogueChoice("listen");
    controller.advanceDialogue();
    const state = controller.getState();
    const map = getDepthMap(1, state.depthMaps);
    const directions = [
      { dx: 1, dy: 0, move: () => controller.moveEast() },
      { dx: -1, dy: 0, move: () => controller.moveWest() },
      { dx: 0, dy: 1, move: () => controller.moveSouth() },
      { dx: 0, dy: -1, move: () => controller.moveNorth() },
    ];
    const queue: Array<{ x: number; y: number; route: number[] }> = [{ x: state.location.x, y: state.location.y, route: [] }];
    const seen = new Set([`${state.location.x},${state.location.y}`]);
    let route: number[] | null = null;
    for (const current of queue) {
      if (map.tiles[current.y][current.x].type === "stairsDown") { route = current.route; break; }
      directions.forEach(({ dx, dy }, index) => {
        const x = current.x + dx; const y = current.y + dy;
        const tile = map.tiles[y]?.[x];
        const key = `${x},${y}`;
        if (tile?.passable && !tile.locked && !tile.trap && !seen.has(key)) {
          seen.add(key); queue.push({ x, y, route: [...current.route, index] });
        }
      });
    }
    expect(route).not.toBeNull();
    let sawFirstBody = false;
    let sawGuardian = false;
    const settle = () => {
      for (let turns = 0; turns < 500 && controller.getState().mode !== "exploration"; turns++) {
        const current = controller.getState();
        if (current.mode === "event") {
          sawFirstBody ||= current.currentEventId === "first_corpse";
          const event = getEventById(current.currentEventId!)!;
          const choice = event.choices.find((entry) => !getChoiceUnavailableReason(entry, current));
          if (!choice) throw new Error(`No playable choice in ${event.id}`);
          controller.chooseEventChoice(choice.id);
        } else if (current.mode === "combat") {
          const combat = controller.getCombatState()!;
          sawGuardian ||= combat.isBossFight && combat.combatDepth === 1;
          if (combat.phase === "victory" || combat.phase === "defeat") { controller.endCombat(); continue; }
          const actor = controller.getCurrentCombatActor();
          if (!actor?.isPlayer) throw new Error("Combat stalled on a non-player turn");
          const targetIndex = combat.encounter.enemies.findIndex((enemy) => enemy.alive);
          controller.submitCombatAction({ type: "attack", actorIndex: actor.index, targetIndex, targetIsEnemy: true, isPlayerAction: true });
        } else {
          throw new Error(`Unexpected mode ${current.mode}`);
        }
      }
    };
    for (const direction of route!) {
      if (controller.getState().location.depth !== 1) break;
      directions[direction].move();
      settle();
    }
    expect(sawFirstBody).toBe(true);
    expect(sawGuardian).toBe(true);
    expect(controller.getState().location.depth).toBe(2);
    expect(controller.getState().mode).toBe("exploration");
  });
});
