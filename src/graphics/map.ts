/**
 * Map data and utilities for dungeon rendering
 * Provides simple map data for each depth to determine wall placement
 * Now synchronized with the actual game map system
 */

import type { DepthMap, MapTile } from "../game/exploration/map";
import { getDepthMap } from "../game/exploration/map";

export interface MapCell {
  walkable: boolean;
  wall: boolean;
  door?: boolean;
  event?: string;
  chest?: boolean;
  stairsUp?: boolean;
  stairsDown?: boolean;
}

export type DungeonMap = MapCell[][];

/**
 * Convert game DepthMap to graphics DungeonMap
 * This ensures the graphics rendering matches the actual playable map
 */
export function generateDepthMap(depth: number, gameDepthMapsCache?: Map<number, DepthMap>): DungeonMap {
  const gameMap: DepthMap = getDepthMap(depth, gameDepthMapsCache);
  const map: DungeonMap = [];

  // Convert game map tiles to graphics map cells
  for (let y = 0; y < gameMap.height; y++) {
    map[y] = [];
    for (let x = 0; x < gameMap.width; x++) {
      const tile: MapTile = gameMap.tiles[y][x];
      map[y][x] = {
        walkable: tile.passable,
        wall: !tile.passable, // Non-passable tiles are walls
        door: isDoorTile(tile.type),
        event: tile.eventId,
        chest: !!tile.chest && !tile.chest.opened,
        stairsUp: tile.type === "stairsUp",
        stairsDown: tile.type === "stairsDown",
      };
    }
  }

  return map;
}

/**
 * Determine if a tile type represents a door
 */
function isDoorTile(tileType: string): boolean {
  return tileType === "stairsDown" || tileType === "stairsUp";
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
