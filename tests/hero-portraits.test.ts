import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseRun, serializeRun } from "../src/game/save";
import { getRandomState, restoreRandomState } from "../src/game/random";
import { heroPortraitRegion, heroPortraitState } from "../src/assets/hero-portraits";
import contract from "../src/assets/hero-atlas-contract.json";

function checkpoint() {
  return parseRun(readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8"));
}

describe("protagonist portraits", () => {
  it("projects wounded, stressed and fallen status with stable threshold precedence", () => {
    const member = checkpoint().state.party.members[0];
    member.stats.hp = member.stats.maxHp;
    member.stats.sanity = member.stats.maxSanity;
    expect(heroPortraitState(member)).toBe("normal");
    member.stats.sanity = member.stats.maxSanity * .29;
    expect(heroPortraitState(member)).toBe("stressed");
    member.stats.hp = member.stats.maxHp * .29;
    expect(heroPortraitState(member)).toBe("wounded");
    member.alive = false;
    expect(heroPortraitState(member)).toBe("fallen");
  });

  it("keeps every expression crop square and inside its own atlas cell", () => {
    const dimensions = contract as { width?: number; height?: number; size?: number };
    for (const member of checkpoint().state.party.members) {
      for (const state of ["normal", "wounded", "stressed", "fallen"] as const) {
        const region = heroPortraitRegion(member.id, state);
        expect(region.width).toBe(region.height);
        expect(region.width).toBeGreaterThanOrEqual(48);
        expect(region.x % contract.frameWidth + region.width).toBeLessThanOrEqual(contract.frameWidth);
        expect(region.y % contract.frameHeight + region.height).toBeLessThanOrEqual(contract.frameHeight);
        expect(region.x + region.width).toBeLessThanOrEqual(dimensions.width ?? dimensions.size!);
        expect(region.y + region.height).toBeLessThanOrEqual(dimensions.height ?? dimensions.size!);
      }
    }
  });

  it("retains recognizable neutral faces for fallen portraits without mutating saves or RNG", () => {
    const snapshot = checkpoint();
    restoreRandomState(snapshot.randomState, snapshot.initialSeed);
    const before = serializeRun(snapshot);
    for (const member of snapshot.state.party.members) {
      expect(heroPortraitRegion(member.id, "fallen")).toEqual(heroPortraitRegion(member.id, "normal"));
      heroPortraitState(member);
    }
    expect(serializeRun(snapshot)).toBe(before);
    expect(getRandomState()).toBe(snapshot.randomState);
  });
});
