import type { GameState } from "../state";

export type TileType = "wall" | "floor" | "stairsDown" | "stairsUp";

export interface MapTile {
  type: TileType;
  passable: boolean;
  eventId?: string;
  encounterChance?: number;
}

export interface DepthMap {
  depth: number;
  width: number;
  height: number;
  tiles: MapTile[][]; // [y][x]
  startX: number;
  startY: number;
}

function createDepth1Map(): DepthMap {
  const width = 8;
  const height = 8;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  // Carve a simple plus-shaped corridor with a small side room.
  const carveFloor = (x: number, y: number, overrides: Partial<MapTile> = {}) => {
    tiles[y][x] = {
      type: "floor",
      passable: true,
      ...overrides,
    };
  };

  for (let x = 1; x < width - 1; x += 1) {
    carveFloor(x, 1);
    carveFloor(x, 4, { encounterChance: 0.2 });
  }

  for (let y = 1; y < height - 1; y += 1) {
    carveFloor(1, y);
    carveFloor(4, y, { encounterChance: 0.2 });
  }

  // Small side room with the pit event.
  carveFloor(5, 2, { eventId: "pit_fall_event" });
  carveFloor(6, 2);

  // Stairs down to the next depth (placeholder).
  tiles[6][6] = { type: "stairsDown", passable: true };

  return {
    depth: 1,
    width,
    height,
    tiles,
    startX: 1,
    startY: 1,
  };
}

function createFallbackMap(depth: number): DepthMap {
  const width = 3;
  const height = 3;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  tiles[1][1] = { type: "floor", passable: true };

  return {
    depth,
    width,
    height,
    tiles,
    startX: 1,
    startY: 1,
  };
}

export function getDepthMap(depth: number): DepthMap {
  if (depth === 1) {
    return createDepth1Map();
  }
  return createFallbackMap(depth);
}

export function getTile(
  map: DepthMap,
  x: number,
  y: number
): MapTile | undefined {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return undefined;
  }
  return map.tiles[y][x];
}

export function getCurrentDepthMap(state: GameState): DepthMap {
  return getDepthMap(state.location.depth);
}
