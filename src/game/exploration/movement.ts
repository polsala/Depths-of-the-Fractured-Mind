import type { GameLocation, GameMode, GameState } from "../state";
import { getCurrentDepthMap, getTile } from "./map";
// import { startEvent } from "../events/engine"; // TODO: wire in event start helper.

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
    // TODO: call startEvent(nextState, tile.eventId) once event routing is centralized.
    nextState = {
      ...nextState,
      currentEventId: tile.eventId,
      mode: "event" satisfies GameMode,
    };
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
