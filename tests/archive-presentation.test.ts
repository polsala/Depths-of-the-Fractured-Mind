import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseRun, serializeRun } from "../src/game/save";
import { generateArchive } from "../src/game/exploration/generation/archive";
import { getRandomState, restoreRandomState } from "../src/game/random";
import { presentDungeon } from "../src/graphics/dungeon/types";
import { npcFallbackLabel, npcPresentationFor } from "../src/graphics/dungeon/npc-presentation";
import { archiveDoorOrientation } from "../src/graphics/dungeon/ArchiveRoomRenderer";

it("copies and freezes semantic Archive identity without retaining mutable world metadata or consuming RNG", () => {
  const snapshot = parseRun(readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8"));
  restoreRandomState(snapshot.randomState, snapshot.initialSeed);
  const map = generateArchive(130013);
  snapshot.state.depthMaps!.set(2, map);
  snapshot.state.location = { depth: 2, x: map.startX, y: map.startY, direction: "north" };
  const before = serializeRun(snapshot), rng = getRandomState();
  const world = presentDungeon(snapshot.state);
  expect(serializeRun(snapshot)).toBe(before);
  expect(getRandomState()).toBe(rng);
  expect(world.map.environment).toEqual(map.environment);
  expect(world.map.environment).not.toBe(map.environment);
  const room = world.map.environment!.rooms[0];
  expect(Object.isFrozen(room.lightingSockets[0])).toBe(true);
  expect(Object.isFrozen(room.constraints.entranceSides)).toBe(true);
  expect(() => Object.assign(room.lightingSockets[0], { x: 100 })).toThrow();
  map.environment!.rooms[0].lightingSockets[0].x += 1;
  expect(room.lightingSockets[0].x).not.toBe(map.environment!.rooms[0].lightingSockets[0].x);
});

it("registers only the actual Keeper NPC and never reuses its identity for unknown or inherited IDs", () => {
  expect(npcPresentationFor("keeper")).toBe("keeper");
  for (const id of ["archive-clerk", "guard", "keeper_of_records", "__proto__", "constructor", "toString"]) {
    expect(npcPresentationFor(id)).toBeUndefined();
    expect(npcFallbackLabel(id)).toContain("appearance unavailable");
  }
});

it("orients the evidence seal across its routed threshold even where the room's lateral cells are open", () => {
  let horizontal = 0, vertical = 0;
  for (const seed of [130013, 1, 2, 3, 7, 17, 41, 100, 511]) {
    const map = generateArchive(seed), edge = map.environment!.edges.find(edge => edge.door)!;
    const index = edge.path.findIndex(point => map.tiles[point.y][point.x].featureId === edge.door!.featureId);
    const door = edge.path[index], approach = edge.path[index - 1];
    const ry = archiveDoorOrientation(map, door.x, door.y);
    // The panel's depth axis must follow travel, independent of the open room
    // cells beside the threshold. Wall-only orientation guessed this wrong.
    const normal = { x: Math.round(Math.sin(ry)), y: Math.round(Math.cos(ry)) };
    expect(Math.abs(normal.x * (door.x - approach.x) + normal.y * (door.y - approach.y))).toBe(1);
    if (normal.x) horizontal++; else vertical++;
  }
  expect(horizontal).toBeGreaterThan(0); expect(vertical).toBeGreaterThan(0);
});
