import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PointLight, Scene } from "three";
import { generateArchive } from "../src/game/exploration/generation/archive";
import { parseRun } from "../src/game/save";
import { getRandomState } from "../src/game/random";
import { presentDungeon } from "../src/graphics/dungeon/types";
import { LightingSystem } from "../src/graphics/dungeon/LightingSystem";
import { archivePracticalFixtures, archiveStationAnchor, galleryFocusAnchor } from "../src/graphics/dungeon/ArchiveLighting";
import type { DungeonPresentationSnapshot } from "../src/graphics/dungeon/types";

function fixture(seed: number): DungeonPresentationSnapshot {
  const run = parseRun(readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8"));
  const map = generateArchive(seed);
  run.state.depthMaps!.set(2, map);
  run.state.location = { depth: 2, x: map.startX, y: map.startY, direction: "north" };
  return presentDungeon(run.state);
}
const at = (world: DungeonPresentationSnapshot, x: number, y: number): DungeonPresentationSnapshot => ({
  ...world, location: { depth: 2, x, y, direction: "north" },
});
const points = (scene: Scene) => scene.children.filter((child): child is PointLight => child instanceof PointLight);
const key = (point: { x: number; y: number; z: number }) => [point.x, point.y, point.z].join(",");

it("never dresses a routed entrance or locked threshold as a wall-mounted station across 100 seeds", () => {
  for (let i = 0; i < 100; i++) {
    const map = generateArchive(i === 0 ? 130013 : (Math.imul(i + 1, 2654435761) >>> 0));
    for (const room of map.environment!.rooms) {
      for (const anchor of [archiveStationAnchor(map, room), galleryFocusAnchor(map, room)]) {
        const outsideX = Math.round((anchor.x - Math.sin(anchor.ry) * 1.37) / 2);
        const outsideY = Math.round((anchor.z - Math.cos(anchor.ry) * 1.37) / 2);
        expect(map.tiles[outsideY][outsideX].type, `${i}/${room.id}`).toBe("wall");
      }
    }
  }
});

it("keeps each room's composed practical pair across its legal floor without changing saved identity or RNG", () => {
  for (const seed of [130013, 1, 2, 41]) {
    const world = fixture(seed), before = JSON.stringify(world), rng = getRandomState(), scene = new Scene();
    const lighting = new LightingSystem(scene, world, "balanced");
    for (const room of world.map.environment!.rooms) {
      const fixtures = archivePracticalFixtures(world.map, room);
      expect(new Set(fixtures.map(source => source.id)).size).toBe(2);
      const expected = fixtures.map(key).sort();
      for (let y = room.y; y < room.y + room.height; y++) for (let x = room.x; x < room.x + room.width; x++) {
        if (!world.map.tiles[y][x].passable) continue;
        lighting.update(at(world, x, y), 1 / 60, true);
        expect(points(scene)).toHaveLength(4);
        expect(points(scene).filter(light => light.intensity > 0).map(light => key(light.position)).sort()).toEqual(expected);
      }
    }
    expect(JSON.stringify(world)).toBe(before);
    expect(getRandomState()).toBe(rng);
  }
});

it("retires visible sources in place during fast room transitions and eventually lights the latest room", () => {
  const world = fixture(130013), scene = new Scene();
  const lighting = new LightingSystem(scene, world, "balanced");
  const rooms = world.map.environment!.rooms;
  const visit = (index: number, dt: number, reduced: boolean) => {
    const room = rooms[index];
    lighting.update(at(world, room.x, room.y), dt, reduced);
  };
  visit(0, 1, true);
  for (const index of [1, 2, 3, 4, 5]) {
    const previous = points(scene).map(light => ({ light, position: key(light.position), intensity: light.intensity }));
    visit(index, 1 / 60, false);
    for (const source of previous) if (source.intensity >= .01) expect(key(source.light.position)).toBe(source.position);
  }
  for (let frame = 0; frame < 240; frame++) visit(5, 1 / 60, false);
  expect(points(scene).filter(light => light.intensity > .01).map(light => key(light.position)).sort())
    .toEqual(archivePracticalFixtures(world.map, rooms[5]).map(key).sort());
  expect(points(scene)).toHaveLength(4);
});
