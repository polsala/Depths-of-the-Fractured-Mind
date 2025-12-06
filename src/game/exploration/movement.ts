import type { GameLocation, GameMode, GameState } from "../state";
import { getCurrentDepthMap, getTile } from "./map";
import { getEventById } from "../events/engine";

function canMoveTo(state: GameState, x: number, y: number): boolean {
  const map = getCurrentDepthMap(state);
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return false;
  }
  const tile = getTile(map, x, y);
  return tile?.passable === true;
}

export function moveBy(state: GameState, dx: number, dy: number): GameState {
  const current: GameLocation = state.location;
  const targetX = current.x + dx;
  const targetY = current.y + dy;

  if (!canMoveTo(state, targetX, targetY)) {
    return state;
  }

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

  if (tile?.eventId) {
    // Check if event exists before triggering
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
  const direction = state.location.direction || "north";
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
  const direction = state.location.direction || "north";
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
  const direction = state.location.direction || "north";
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
  const direction = state.location.direction || "north";
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
