import { describe, expect, it } from "vitest";
import { createIntakeMap, INTAKE_FEATURES, INTAKE_LAYOUT_ID, INTAKE_ROOMS } from "../src/game/exploration/authored/depth1-intake";
import type { DepthMap } from "../src/game/exploration/map";
import { getRandomState, startRun } from "../src/game/random";

function reachable(map: DepthMap): Set<string> {
  const queue = [[map.startX, map.startY]];
  const reached = new Set<string>();
  for (const [x, y] of queue) {
    const key = `${x},${y}`;
    if (reached.has(key)) continue;
    const tile = map.tiles[y]?.[x];
    if (!tile?.passable || tile.locked) continue;
    reached.add(key);
    queue.push([x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]);
  }
  return reached;
}

describe("authored intake layout", () => {
  it("provides purposeful rooms and stable feature identities without consuming RNG", () => {
    startRun(130013);
    const before = getRandomState();
    const first = createIntakeMap();
    const second = createIntakeMap();
    expect(getRandomState()).toBe(before);
    expect(first).toEqual(second);
    expect(first.layoutId).toBe(INTAKE_LAYOUT_ID);
    expect(INTAKE_ROOMS.every((room) => room.purpose.length > 10)).toBe(true);
    for (const feature of Object.values(INTAKE_FEATURES)) expect(first.tiles[feature.y][feature.x].featureId).toBe(feature.id);
    expect(first.tiles[15][3].npcId).toBe("keeper");
    expect(first.tiles.flat().some((tile) => tile.encounterChance || tile.trap)).toBe(false);
  });

  it("makes the breaker and secret available before their shutter, then opens a route to evidence and back", () => {
    const map = createIntakeMap();
    const closed = reachable(map);
    expect(closed.has("18,7")).toBe(true); // Stand south of the wall-mounted breaker.
    expect(closed.has("18,12")).toBe(true);
    expect(closed.has("4,12")).toBe(true); // Counter interaction point.
    expect(closed.has("12,3")).toBe(false);
    map.tiles[6][12].locked = false;
    const opened = reachable(map);
    expect(opened.has("12,3")).toBe(true);
    expect(opened.has("4,12")).toBe(true);
    expect(opened.has("2,14")).toBe(true);
    expect(map.tiles[14][2].type).toBe("floor"); // Cannot bypass the return payoff.
  });
});
