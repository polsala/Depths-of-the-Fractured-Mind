/**
 * Map data and utilities for dungeon rendering
 * Provides simple map data for each depth to determine wall placement
 */

// Constants
const DEFAULT_MAP_SIZE = 10;

export interface MapCell {
  walkable: boolean;
  wall: boolean;
  door?: boolean;
  event?: string;
}

export type DungeonMap = MapCell[][];

/**
 * Generate a simple procedural map for a depth
 * Creates a basic dungeon layout with corridors
 */
export function generateDepthMap(depth: number, size: number = DEFAULT_MAP_SIZE): DungeonMap {
  const map: DungeonMap = [];

  // Initialize all cells as walls
  for (let y = 0; y < size; y++) {
    map[y] = [];
    for (let x = 0; x < size; x++) {
      map[y][x] = { walkable: false, wall: true };
    }
  }

  // Create a simple cross-shaped corridor pattern
  const centerX = Math.floor(size / 2);
  const centerY = Math.floor(size / 2);

  // Vertical corridor
  for (let y = 0; y < size; y++) {
    map[y][centerX] = { walkable: true, wall: false };
    if (centerX > 0) map[y][centerX - 1] = { walkable: true, wall: false };
    if (centerX < size - 1) map[y][centerX + 1] = { walkable: true, wall: false };
  }

  // Horizontal corridor
  for (let x = 0; x < size; x++) {
    map[centerY][x] = { walkable: true, wall: false };
    if (centerY > 0) map[centerY - 1][x] = { walkable: true, wall: false };
    if (centerY < size - 1) map[centerY + 1][x] = { walkable: true, wall: false };
  }

  // Add some rooms based on depth
  if (depth >= 2) {
    // Top-left room
    for (let y = 1; y < 3; y++) {
      for (let x = 1; x < 3; x++) {
        map[y][x] = { walkable: true, wall: false };
      }
    }
  }

  if (depth >= 3) {
    // Bottom-right room
    for (let y = size - 3; y < size - 1; y++) {
      for (let x = size - 3; x < size - 1; x++) {
        map[y][x] = { walkable: true, wall: false };
      }
    }
  }

  return map;
}

/**
 * Get the map cell at a position
 */
export function getMapCell(
  map: DungeonMap,
  x: number,
  y: number
): MapCell | undefined {
  if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) {
    return undefined;
  }
  return map[y][x];
}

/**
 * Check if there's a wall at a position
 */
export function hasWallAt(map: DungeonMap, x: number, y: number): boolean {
  const cell = getMapCell(map, x, y);
  return cell ? cell.wall : true; // Treat out-of-bounds as walls
}

/**
 * Get walls visible from a position looking in a direction
 * Returns information about walls in front, left, and right
 */
export function getVisibleWalls(
  map: DungeonMap,
  x: number,
  y: number,
  direction: "north" | "south" | "east" | "west",
  distance: number
): {
  front: boolean;
  left: boolean;
  right: boolean;
} {
  let checkX = x;
  let checkY = y;

  // Move forward based on direction
  switch (direction) {
    case "north":
      checkY -= distance;
      break;
    case "south":
      checkY += distance;
      break;
    case "east":
      checkX += distance;
      break;
    case "west":
      checkX -= distance;
      break;
  }

  // Check front wall
  const front = hasWallAt(map, checkX, checkY);

  // Check left and right walls based on direction
  let left = false;
  let right = false;

  switch (direction) {
    case "north":
      left = hasWallAt(map, checkX - 1, checkY);
      right = hasWallAt(map, checkX + 1, checkY);
      break;
    case "south":
      left = hasWallAt(map, checkX + 1, checkY);
      right = hasWallAt(map, checkX - 1, checkY);
      break;
    case "east":
      left = hasWallAt(map, checkX, checkY - 1);
      right = hasWallAt(map, checkX, checkY + 1);
      break;
    case "west":
      left = hasWallAt(map, checkX, checkY + 1);
      right = hasWallAt(map, checkX, checkY - 1);
      break;
  }

  return { front, left, right };
}
