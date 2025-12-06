import type { GameLocation, GameMode, GameState } from "../state";
import { getCurrentDepthMap, getTile, getDepthMap } from "./map";
import { getEventById } from "../events/engine";
import { audioManager } from "../../ui/audio";
import { addItem } from "../inventory";
import { shouldTriggerEncounter, generateRandomEncounter } from "../combat/encounters";

// Default facing direction when not specified
const DEFAULT_DIRECTION = "north" as const;

function canMoveTo(state: GameState, x: number, y: number): boolean {
  const map = getCurrentDepthMap(state);
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return false;
  }
  const tile = getTile(map, x, y);
  if (!tile?.passable) return false;
  
  // Check if door is locked
  if (tile.type === "door" && tile.locked) {
    return false;
  }
  
  return true;
}

function markTileDiscovered(state: GameState, x: number, y: number): void {
  const map = getCurrentDepthMap(state);
  const tile = getTile(map, x, y);
  if (tile) {
    tile.discovered = true;
  }
  
  // Mark in visited tiles set
  const tileKey = `${state.location.depth}-${x}-${y}`;
  if (state.flags.visitedTiles instanceof Set) {
    state.flags.visitedTiles.add(tileKey);
  }
}

export function moveBy(state: GameState, dx: number, dy: number): GameState {
  const current: GameLocation = state.location;
  const targetX = current.x + dx;
  const targetY = current.y + dy;

  if (!canMoveTo(state, targetX, targetY)) {
    return state;
  }

  // Play footstep sound
  audioManager.playSfx("step");

  const map = getCurrentDepthMap(state);
  const tile = getTile(map, targetX, targetY);

  let nextState: GameState = {
    ...state,
    location: {
      ...state.location,
      x: targetX,
      y: targetY,
    },
  };

  // Mark tile as discovered (fog of war)
  markTileDiscovered(nextState, targetX, targetY);

  // Handle stairs
  if (tile?.type === "stairsDown") {
    const nextDepth = state.location.depth + 1;
    if (nextDepth <= 5) {
      const nextMap = getDepthMap(nextDepth);
      nextState = {
        ...nextState,
        location: {
          depth: nextDepth,
          x: nextMap.startX,
          y: nextMap.startY,
          direction: state.location.direction,
        },
      };
      markTileDiscovered(nextState, nextMap.startX, nextMap.startY);
    }
  } else if (tile?.type === "stairsUp") {
    const prevDepth = state.location.depth - 1;
    if (prevDepth >= 1) {
      const prevMap = getDepthMap(prevDepth);
      nextState = {
        ...nextState,
        location: {
          depth: prevDepth,
          x: prevMap.startX,
          y: prevMap.startY,
          direction: state.location.direction,
        },
      };
      markTileDiscovered(nextState, prevMap.startX, prevMap.startY);
    }
  }

  // Handle item pickup
  if (tile?.itemId && !tile.trap?.triggered) {
    if (addItem(nextState.party.inventory, tile.itemId)) {
      tile.itemId = undefined; // Remove item from map
      audioManager.playSfx("ui_click");
    }
  }

  // Handle traps
  if (tile?.trap && !tile.trap.triggered && !tile.trap.detected) {
    tile.trap.triggered = true;
    
    // Apply trap effects to party
    if (tile.trap.damage) {
      nextState.party.members.forEach((member) => {
        if (member.alive) {
          member.stats.hp = Math.max(0, member.stats.hp - (tile.trap?.damage || 0));
          if (member.stats.hp === 0) {
            member.alive = false;
          }
        }
      });
    }
    
    if (tile.trap.sanityLoss) {
      nextState.party.members.forEach((member) => {
        if (member.alive) {
          member.stats.sanity = Math.max(0, member.stats.sanity - (tile.trap?.sanityLoss || 0));
        }
      });
      audioManager.playSfx("sanity_tick");
    }
  }

  // Handle events
  if (tile?.eventId) {
    const eventExists = getEventById(tile.eventId);
    if (eventExists) {
      nextState = {
        ...nextState,
        currentEventId: tile.eventId,
        mode: "event" satisfies GameMode,
      };
    } else {
      console.warn(`Event ${tile.eventId} referenced by map tile but not registered. Event loading may not be complete.`);
    }
  }
  
  // Check for random encounters (only if not already in an event)
  if (nextState.mode === "exploration" && tile?.encounterChance) {
    if (shouldTriggerEncounter(nextState, tile.encounterChance)) {
      const encounter = generateRandomEncounter(nextState.location.depth);
      if (encounter) {
        // Store encounter data temporarily (in a real implementation, this would be in game state)
        nextState = {
          ...nextState,
          mode: "combat" satisfies GameMode,
        };
      }
    }
  }

  return nextState;
}

export function moveNorth(state: GameState): GameState {
  return moveBy(state, 0, -1);
}

export function moveSouth(state: GameState): GameState {
  return moveBy(state, 0, 1);
}

export function moveWest(state: GameState): GameState {
  return moveBy(state, -1, 0);
}

export function moveEast(state: GameState): GameState {
  return moveBy(state, 1, 0);
}

/**
 * Move forward in the direction the player is facing
 */
export function moveForward(state: GameState): GameState {
  const direction = state.location.direction || DEFAULT_DIRECTION;
  switch (direction) {
    case "north":
      return moveNorth(state);
    case "south":
      return moveSouth(state);
    case "east":
      return moveEast(state);
    case "west":
      return moveWest(state);
    default:
      return state;
  }
}

/**
 * Move backward (opposite to facing direction)
 */
export function moveBackward(state: GameState): GameState {
  const direction = state.location.direction || DEFAULT_DIRECTION;
  switch (direction) {
    case "north":
      return moveSouth(state);
    case "south":
      return moveNorth(state);
    case "east":
      return moveWest(state);
    case "west":
      return moveEast(state);
    default:
      return state;
  }
}

/**
 * Strafe left (perpendicular to facing direction)
 */
export function strafeLeft(state: GameState): GameState {
  const direction = state.location.direction || DEFAULT_DIRECTION;
  switch (direction) {
    case "north":
      return moveWest(state);
    case "south":
      return moveEast(state);
    case "east":
      return moveNorth(state);
    case "west":
      return moveSouth(state);
    default:
      return state;
  }
}

/**
 * Strafe right (perpendicular to facing direction)
 */
export function strafeRight(state: GameState): GameState {
  const direction = state.location.direction || DEFAULT_DIRECTION;
  switch (direction) {
    case "north":
      return moveEast(state);
    case "south":
      return moveWest(state);
    case "east":
      return moveSouth(state);
    case "west":
      return moveNorth(state);
    default:
      return state;
  }
}
