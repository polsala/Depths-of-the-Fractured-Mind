import type { GameLocation, GameState } from "../state";
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
        mode: "event",
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
