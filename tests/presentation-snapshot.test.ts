import { expect, it } from "vitest";
import { presentDungeon } from "../src/graphics/dungeon/types";
import { generateDepthMap } from "../src/graphics/map";
import { parseRun, serializeRun } from "../src/game/save";
import { readFileSync } from "node:fs";
import { getRandomState, restoreRandomState } from "../src/game/random";

it("projects a frozen v1 map without generating other depths, changing RNG or mutating a save", () => {
  const raw = readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8");
  const snapshot = parseRun(raw);
  restoreRandomState(snapshot.randomState, snapshot.initialSeed);
  const before = serializeRun(snapshot);
  const first = presentDungeon(snapshot.state);
  generateDepthMap(1, snapshot.state.depthMaps);
  expect(first.map.tiles).not.toBe(snapshot.state.depthMaps?.get(1)?.tiles);
  expect(() => generateDepthMap(2, snapshot.state.depthMaps)).toThrow(/cannot generate/);
  expect(snapshot.state.depthMaps?.size).toBe(1);
  expect(getRandomState()).toBe(snapshot.randomState);
  expect(serializeRun(snapshot)).toBe(before);
  expect(Object.isFrozen(first.location)).toBe(true);
});

it("copies only presentation data and cannot retain mutable chest loot or traps", () => {
  const saved = parseRun(readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8"));
  const tile = saved.state.depthMaps!.get(1)!.tiles[1][1];
  tile.chest = { loot: [{ itemId: "medkit", quantity: 1 }], opened: false };
  tile.trap = { id: "test", name: "test", description: "test", detected: false, triggered: false };
  const first = presentDungeon(saved.state);
  expect(first.map.tiles[1][1].chest).toEqual({ opened: false });
  expect(first.map.tiles[1][1]).not.toHaveProperty("trap");
  tile.chest.opened = true;
  expect(first.map.tiles[1][1].chest?.opened).toBe(false);
  expect(Object.isFrozen(first.map.tiles[1][1].chest)).toBe(true);
  expect(Object.isFrozen(first.map.tiles)).toBe(true);
});

it("derives perception from the living witness's SAN without changing navigation or randomness", () => {
  const saved = parseRun(readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8"));
  const witness = saved.state.party.members.find((member) => member.id === "subject13")!;
  witness.stats.sanity = witness.stats.maxSanity;
  const high = presentDungeon(saved.state);
  witness.stats.sanity = Math.floor(witness.stats.maxSanity * .5);
  expect(presentDungeon(saved.state).perception).toBe("mid");
  witness.stats.sanity = 0;
  const low = presentDungeon(saved.state);
  expect(high.perception).toBe("high");
  expect(low.perception).toBe("low");
  expect(low.map).toEqual(high.map);
  expect(low.location).toEqual(high.location);
  expect(low.flags).toEqual(high.flags);
});
