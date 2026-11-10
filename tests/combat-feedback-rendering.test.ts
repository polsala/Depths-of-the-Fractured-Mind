import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { parseRun } from "../src/game/save";
import { renderCombatUI } from "../src/graphics/combat-ui";
import { drawHero } from "../src/assets/hero-sprites";
import { drawEnemy } from "../src/assets/enemy-visuals";
import { COMBAT_CONTACT_MS } from "../src/graphics/combat-presentation";

vi.mock("../src/assets/hero-sprites", () => ({ drawHero: vi.fn(() => true),
  heroAtlasUrl: () => "atlas.png", heroImage: () => null, heroFrame: () => ({ x: 0, y: 0 }) }));
vi.mock("../src/assets/enemy-visuals", () => ({ drawEnemy: vi.fn(() => true) }));

it("renders defender recoil and damage at contact while preserving committed combat outcomes", () => {
  const state = parseRun(readFileSync(new URL("./fixtures/saves/v1/combat.json", import.meta.url), "utf8")).state.combatState!;
  const target = state.party.members[1];
  const enemy = state.encounter.enemies[0];
  target.alive = true; enemy.alive = true;
  const fillText = vi.fn();
  const ctx = new Proxy({ fillText }, { get: (object, key) => key in object ? object[key as keyof typeof object] : () => undefined });
  const canvas = { width: 800, height: 500, getContext: () => ctx } as unknown as HTMLCanvasElement;
  const cue = { actorId: state.party.members[0].id, animation: "attack" as const, hitIds: [target.id],
    enemyHits: [{ index: 0, damage: 5 }], startedAt: 1000 };
  const before = JSON.stringify(state);
  renderCombatUI(canvas, state, { width: 800, height: 500, nowMs: 1000, visualCue: cue });
  expect(vi.mocked(drawEnemy).mock.calls[0][2]).toBe("idle");
  expect(vi.mocked(drawHero).mock.calls.find((call) => call[1] === target.id)?.[2]).toBe("idle");
  expect(fillText.mock.calls.some((call) => call[0] === "-5")).toBe(false);
  vi.mocked(drawEnemy).mockClear(); vi.mocked(drawHero).mockClear(); fillText.mockClear();
  renderCombatUI(canvas, state, { width: 800, height: 500, nowMs: 1000 + COMBAT_CONTACT_MS, visualCue: cue });
  expect(vi.mocked(drawEnemy).mock.calls[0].slice(2, 4)).toEqual(["hit", 0]);
  expect(vi.mocked(drawHero).mock.calls.find((call) => call[1] === target.id)?.slice(2, 4)).toEqual(["hit", 0]);
  expect(fillText.mock.calls.some((call) => call[0] === "-5")).toBe(true);
  expect(JSON.stringify(state)).toBe(before);
});
