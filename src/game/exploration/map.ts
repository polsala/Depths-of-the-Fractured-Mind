import type { GameState } from "../state";
import { generateProceduralMap } from "./map-generator";

export type TileType = "wall" | "floor" | "stairsDown" | "stairsUp" | "door";

export interface TrapData {
  id: string;
  name: string;
  description: string;
  detected: boolean;
  triggered: boolean;
  damage?: number;
  sanityLoss?: number;
  effect?: string;
}

export interface MapTile {
  type: TileType;
  passable: boolean;
  eventId?: string;
  encounterChance?: number;
  trap?: TrapData;
  itemId?: string;
  discovered?: boolean;
  locked?: boolean;
  interactionText?: string;
}

export interface DepthMap {
  depth: number;
  width: number;
  height: number;
  tiles: MapTile[][]; // [y][x]
  startX: number;
  startY: number;
}

export function getDepthMap(depth: number): DepthMap {
  // Use procedural generation for all depths
  return generateProceduralMap(depth);
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
