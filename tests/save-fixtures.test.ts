import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GameController } from "../src/game/index";
import { parseRun, serializeRun } from "../src/game/save";
import { gameRandom } from "../src/game/random";
import { getCurrentActor } from "../src/game/combat/state";
import { getEventById } from "../src/game/events/engine";
import manifest from "./fixtures/saves/v1/manifest.json";

beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ version: "1", events: [] }) }))));
afterEach(() => vi.unstubAllGlobals());

for (const fixture of manifest.files) {
  it(`continues frozen v1 ${fixture.path} with its map, state and RNG intact`, () => {
    const raw = readFileSync(new URL(`./fixtures/saves/v1/${fixture.path}`, import.meta.url), "utf8");
    expect(createHash("sha256").update(raw).digest("hex")).toBe(fixture.sha256);
    const snapshot = parseRun(raw);
    const controller = new GameController(1);
    controller.restore(snapshot);
    expect(controller.getState().mode).toBe(fixture.mode);
    expect(JSON.parse(serializeRun(controller.snapshot())).state).toEqual(JSON.parse(raw).state);
    expect(gameRandom()).toBe(fixture.nextRandom);
    const state = controller.getState();
    if (fixture.path === "progressed.json") {
      expect(state.party.members[0].stats.hp).toBe(11);
      expect(state.party.members[0].equipment?.weapon).toBe("warden_baton");
      expect(state.depthMaps?.get(2)?.tiles[state.location.y][state.location.x].chest?.opened).toBe(true);
      expect(state.flags.bossDefeatedDepths?.has(1)).toBe(true);
    }
    if (fixture.mode === "combat") {
      const combat = state.combatState!;
      expect(combat.party).toBe(state.party);
      const actor = getCurrentActor(combat)!;
      expect(actor.isPlayer).toBe(true);
      controller.submitCombatAction({ type: "defend", actorIndex: actor.index, isPlayerAction: true });
      expect(controller.getCombatState()!.currentTurnIndex).toBeGreaterThan(0);
    }
    if (fixture.mode === "event") {
      const choice = getEventById(state.currentEventId!)!.choices[0];
      controller.chooseEventChoice(choice.id);
      expect(controller.getState().flags.completedEventIds?.has("first_corpse")).toBe(true);
    }
    if (fixture.mode === "conversation") {
      controller.leaveDialogue();
      expect(controller.getState().mode).toBe("exploration");
      expect(controller.startDialogue()).toBe(true);
    }
  });
}
