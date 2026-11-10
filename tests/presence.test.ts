import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GameController } from "../src/game";
import { serializeRun } from "../src/game/save";
import { PresenceDirector, PRESENCE_ACTION_MS, type PresenceAction } from "../src/graphics/presence/PresenceDirector";
import events from "../public/data/events.json";

function scene() {
  const controller = new GameController(); controller.newGame(130013);
  controller.getState().mode = "exploration";
  const director = new PresenceDirector(); director.sync(controller.getState());
  return { controller, director };
}

describe("passive first-person acting", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => structuredClone(events) }))); });
  afterEach(() => { vi.unstubAllGlobals(); });
  it("copies party scalars, selects living viewpoints and cannot mutate saves or RNG", () => {
    const { controller, director } = scene();
    const before = serializeRun({ ...controller.snapshot(), savedAt: "fixed" });
    for (const id of ["elias", "miriam", "subject13", "anya"] as const) {
      director.select(id);
      for (const action of Object.keys(PRESENCE_ACTION_MS) as PresenceAction[]) {
        director.play(action, 1000);
        for (const time of [1000, 1144, 1320, 1649, 3000]) {
          const frame = director.sample(time, false);
          expect(frame.person?.id).toBe(id); expect(frame.pose).toBeGreaterThanOrEqual(0);
          expect(frame.pose).toBeLessThan(8);
          expect(Object.isFrozen(frame.person)).toBe(true);
        }
      }
    }
    expect(serializeRun({ ...controller.snapshot(), savedAt: "fixed" })).toBe(before);
    const state = controller.getState();
    state.party.members[3].stats.hp = 0; state.party.members[3].alive = false;
    director.sync(state); director.select("anya");
    expect(director.selected).toBe("elias");
    director.play("interact", 1000, "elias");
    state.party.members[0].alive = false; state.party.members[0].stats.hp = 0;
    director.sync(state);
    expect(director.sample(1200, false).person?.id).toBe("miriam");
    expect(director.sample(1200, false).phase).toBe("rest");
  });

  it("uses anticipation, contact and recovery inside the existing 650ms combat cue", () => {
    const { director } = scene(); director.play("attack", 1000);
    expect(director.sample(1000, false)).toMatchObject({ pose: 5, phase: "anticipation" });
    expect(director.sample(1143, false)).toMatchObject({ pose: 3, phase: "contact" });
    expect(director.sample(1403, false)).toMatchObject({ pose: 0, phase: "recovery" });
    expect(director.sample(1650, false)).toMatchObject({ action: "idle", phase: "rest" });
    expect(director.sample(900, false).action).toBe("idle");
  });

  it("retains readable poses without translation, breathing or rotation in reduced motion", () => {
    const { director } = scene();
    for (const action of Object.keys(PRESENCE_ACTION_MS) as PresenceAction[]) {
      director.play(action, 1000);
      const a = director.sample(1001, true), b = director.sample(1200, true);
      expect(a).toMatchObject({ x: 0, y: 0, rotation: 0 });
      expect(b).toMatchObject({ x: 0, y: 0, rotation: 0 });
      expect(a.pose).toBe(b.pose);
    }
  });

  it("gives injury and distress static cues and clears transient gestures at mode boundaries", () => {
    const { controller, director } = scene(); const state = controller.getState();
    state.party.members[0].stats.hp = 1; state.party.members[0].stats.sanity = 1;
    director.sync(state);
    expect(director.sample(1000, true)).toMatchObject({ action: "hurt", pose: 6 });
    state.party.members[0].stats.hp = state.party.members[0].stats.maxHp;
    director.sync(state);
    expect(director.sample(1000, true)).toMatchObject({ action: "tension", pose: 7 });
    director.play("interact", 1000);
    director.sync({ ...state, mode: "event" });
    expect(director.sample(1200, false).visible).toBe(false);
    director.sync(state);
    expect(director.sample(1200, false).phase).toBe("rest");
    expect(director.sample(1200, false, true).visible).toBe(false);
  });

  it("uses the resolving combat actor for the complete cue even when the next turn changes", () => {
    const { controller, director } = scene(); const state = { ...controller.getState(), mode: "combat" as const };
    director.sync(state, "miriam"); director.play("cast", 1000, "miriam");
    director.sync(state, "anya");
    expect(director.sample(1300, false).person?.id).toBe("miriam");
    expect(director.sample(1700, false).person?.id).toBe("anya");
    director.cancel(); expect(director.sample(1100, false).phase).toBe("rest");
  });
});
