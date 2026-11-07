import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import eventData from "../public/data/events.json";
import { GameController } from "../src/game/index";
import { getDepthMap, type DepthMap } from "../src/game/exploration/map";
import { getDialogue, getDialogueChoiceUnavailableReason } from "../src/game/dialogue";
import { clearEventData, getPoolEventIds } from "../src/game/events/loader";
import { getAvailableEvents } from "../src/game/events/procedural";
import { getChoiceUnavailableReason, getEventById } from "../src/game/events/engine";
import { addItem, getItemCount } from "../src/game/inventory";
import { parseRun, serializeRun } from "../src/game/save";
import { nextRequiredBeat } from "../src/game/story";

beforeEach(() => {
  clearEventData();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => structuredClone(eventData) })));
});
afterEach(() => vi.unstubAllGlobals());

async function controllerFor(seed: number): Promise<GameController> {
  const controller = new GameController(seed);
  await vi.waitFor(() => expect(controller.isEventsLoaded()).toBe(true));
  controller.getState().mode = "exploration";
  return controller;
}

function routeExists(map: DepthMap): boolean {
  const seen = new Set([`${map.startX},${map.startY}`]);
  const queue = [{ x: map.startX, y: map.startY }];
  for (const { x, y } of queue) {
    if (map.tiles[y][x].type === "stairsDown") return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      const tile = map.tiles[ny]?.[nx];
      const key = `${nx},${ny}`;
      if (tile?.passable && !seen.has(key)) { seen.add(key); queue.push({ x: nx, y: ny }); }
    }
  }
  return false;
}

function approachStair(controller: GameController, depth: number): void {
  const state = controller.getState();
  const map = getDepthMap(depth, state.depthMaps);
  const stairY = map.tiles.findIndex((row) => row.some((tile) => tile.type === "stairsDown"));
  const stairX = map.tiles[stairY].findIndex((tile) => tile.type === "stairsDown");
  const directions = [
    { dx: 1, dy: 0, move: () => controller.moveWest() },
    { dx: -1, dy: 0, move: () => controller.moveEast() },
    { dx: 0, dy: 1, move: () => controller.moveNorth() },
    { dx: 0, dy: -1, move: () => controller.moveSouth() },
  ];
  const neighbor = directions.find(({ dx, dy }) => map.tiles[stairY + dy]?.[stairX + dx]?.passable);
  if (!neighbor) throw new Error(`No approach to depth ${depth} stair`);
  state.location = { depth, x: stairX + neighbor.dx, y: stairY + neighbor.dy, direction: "north" };
  state.mode = "exploration";
  neighbor.move();
}

describe("authored chapter path", () => {
  it("connects every authored event to a valid depth pool", async () => {
    await controllerFor(17);
    const referenced = new Set(eventData.pools.flatMap((pool) => getPoolEventIds(pool.id)));
    expect(eventData.events.filter((event) => !referenced.has(event.id))).toEqual([]);
    for (const event of eventData.events) {
      const metadata = event.metadata?.triggerConditions;
      const depthPools = eventData.pools.filter((pool) => /^depth_\d+_events$/.test(pool.id) && pool.events.includes(event.id));
      for (const pool of depthPools) {
        const depth = Number(pool.id.match(/\d+/)![0]);
        expect(depth).toBeGreaterThanOrEqual(metadata?.minDepth ?? 1);
        expect(depth).toBeLessThanOrEqual(metadata?.maxDepth ?? 5);
        if (metadata?.specificDepth) expect(depth).toBe(metadata.specificDepth);
      }
    }
  });

  it("makes each formerly orphaned event selectable at its assigned depth", async () => {
    const controller = await controllerFor(24);
    const assigned = [
      [2, ["personnel_files", "video_surveillance", "director_office", "locked_safe", "elias_discipline_chamber", "anya_chapel_ruins"]],
      [3, ["medication_dispensary", "therapy_session_recording", "isolation_chamber", "miriam_surgery_logs", "subject13_containment", "mutated_plants"]],
      [4, ["fractured_memory", "accusation_chamber", "final_message"]],
      [5, ["engine_whispers", "subject13_vision"]],
    ] as const;
    for (const [depth, ids] of assigned) {
      controller.getState().location.depth = depth;
      expect(getAvailableEvents(controller.getState(), [...ids])).toEqual([...ids]);
    }
  });

  it("routes seeded maps to every chapter, forcing each beat before its boss", async () => {
    for (const seed of [1, 47, 2026]) {
      const controller = await controllerFor(seed);
      for (let depth = 1; depth <= 4; depth++) {
        expect(routeExists(getDepthMap(depth, controller.getState().depthMaps))).toBe(true);
        approachStair(controller, depth);
        const required = ({ 2: ["riot_recording_event", "pit_fall_event"], 3: ["overflow_ward_event"], 4: ["confessional_chair_event"] } as Record<number, string[]>)[depth] ?? [];
        for (const id of required) {
          expect(controller.getState().mode).toBe("event");
          expect(controller.getState().currentEventId).toBe(id);
          const choice = ({ riot_recording_event: "deny_recording", pit_fall_event: "abandon", overflow_ward_event: "leave_ward", confessional_chair_event: "refuse_engage" } as Record<string, string>)[id];
          controller.chooseEventChoice(choice);
          expect(controller.getState().flags.completedEventIds?.has(id)).toBe(true);
        }
        expect(nextRequiredBeat(controller.getState())).toBeNull();
        expect(controller.getState().mode).toBe("combat");
        expect(controller.getCombatState()?.isBossFight).toBe(true);
        // This test isolates story routing. Combat action balance is covered elsewhere.
        controller.getCombatState()!.phase = "victory";
        controller.endCombat();
        approachStair(controller, depth);
        expect(controller.getState().location.depth).toBe(depth + 1);
      }
      expect(controller.getState().location.depth).toBe(5);
    }
  });

  it("does not softlock a required recording when its associated character has died", async () => {
    const controller = await controllerFor(88);
    const miriam = controller.getState().party.members.find((member) => member.id === "miriam")!;
    miriam.alive = false;
    miriam.stats.hp = 0;
    approachStair(controller, 3);
    expect(controller.getState().currentEventId).toBe("overflow_ward_event");
    controller.chooseEventChoice("leave_ward");
    expect(controller.getState().mode).toBe("combat");
  });
});

describe("Keeper conversation", () => {
  it("is adjacent to the entrance, branches once, persists mid-dialogue and gates a later clue", async () => {
    const controller = await controllerFor(99);
    expect(controller.getNearbyNpcId()).toBe("keeper");
    expect(controller.startDialogue()).toBe(true);
    expect(controller.getState().currentDialogueId).toBe("keeper_intro");
    const resumed = await controllerFor(100);
    resumed.restore(parseRun(serializeRun(controller.snapshot())));
    expect(resumed.getState().currentDialogueId).toBe("keeper_intro");
    expect(resumed.chooseDialogueChoice("listen")).toBe(true);
    expect(resumed.getState().flags.keeperTruthShared).toBe(true);
    expect(resumed.getState().currentDialogueId).toBe("keeper_revelation");
    resumed.advanceDialogue();
    expect(resumed.getState().mode).toBe("exploration");
    expect(resumed.startDialogue()).toBe(true);
    expect(resumed.getState().currentDialogueId).toBe("keeper_return");
    const share = getDialogue("keeper_return")!.choices!.find((choice) => choice.id === "share_logs")!;
    const card = getDialogue("keeper_return")!.choices!.find((choice) => choice.id === "show_card")!;
    expect(getDialogueChoiceUnavailableReason(share, resumed.getState())).not.toBeNull();
    expect(getDialogueChoiceUnavailableReason(card, resumed.getState())).not.toBeNull();
    resumed.getState().flags.security_logs_read = true;
    const truthBefore = resumed.getState().flags.moral.truth;
    expect(resumed.chooseDialogueChoice("share_logs")).toBe(true);
    expect(resumed.getState().flags.moral.truth).toBe(truthBefore + 1);
    expect(resumed.startDialogue()).toBe(true);
    expect(getDialogueChoiceUnavailableReason(share, resumed.getState())).not.toBeNull();
    expect(resumed.chooseDialogueChoice("share_logs")).toBe(false);
    addItem(resumed.getState().party.inventory, "access_card");
    expect(resumed.chooseDialogueChoice("show_card")).toBe(true);
    expect(resumed.getState().flags.keeperCardShown).toBe(true);
    const saved = await controllerFor(101);
    saved.restore(parseRun(serializeRun(resumed.snapshot())));
    expect(saved.getState().flags.keeperCardShown).toBe(true);

    saved.getState().location.depth = 2;
    saved.startEvent("director_office");
    const clue = getEventById("director_office")!.choices.find((choice) => choice.id === "follow_keepers_clue")!;
    expect(getChoiceUnavailableReason(clue, saved.getState())).toBeNull();
    saved.chooseEventChoice("follow_keepers_clue");
    expect(saved.getState().flags.keeperLeadFollowed).toBe(true);
    expect(getItemCount(saved.getState().party.inventory, "staff_memo")).toBe(1);
  });

  it("does not expose the later clue after dismissing the Keeper", async () => {
    const controller = await controllerFor(23);
    controller.startDialogue();
    controller.chooseDialogueChoice("dismiss");
    controller.getState().location.depth = 2;
    controller.startEvent("director_office");
    const clue = getEventById("director_office")!.choices.find((choice) => choice.id === "follow_keepers_clue")!;
    expect(getChoiceUnavailableReason(clue, controller.getState())).not.toBeNull();
    controller.chooseEventChoice("follow_keepers_clue");
    expect(controller.getState().flags.keeperLeadFollowed).toBeUndefined();
  });
});
