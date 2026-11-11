import type { GameState } from "../state";
import { generateArchive } from "./generation/archive";
import type { ArchiveEnvironment, GenerationPolicy } from "./generation/world-definition";
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
  chest?: {
    loot: Array<{ itemId: string; quantity: number }>;
    opened?: boolean;
  };
  vendor?: boolean;
  npcId?: "keeper";
  /** Stable authored interaction identity; rules, not the renderer, resolve it. */
  featureId?: string;
}

export interface DepthMap {
  /** Missing on legacy/procedural maps. Persisted maps are never replaced. */
  layoutId?: string;
  environment?: ArchiveEnvironment;
  depth: number;
  width: number;
  height: number;
  tiles: MapTile[][]; // [y][x]
  startX: number;
  startY: number;
}

export function getDepthMap(depth: number, cache?: Map<number, DepthMap>, policy?: GenerationPolicy): DepthMap {
  // If cache is provided, check if map already exists
  if (cache && cache.has(depth)) {
    return cache.get(depth)!;
  }
  
  // Generate new map
  const map = policy?.version === 1 && depth === 2 ? generateArchive(policy.runSeed) : generateProceduralMap(depth);
  
  // Store in cache if provided
  if (cache) {
    cache.set(depth, map);
  }
  
  return map;
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
  return getDepthMap(state.location.depth, state.depthMaps, state.generationPolicy);
}
