import type { GameOverCause, GameState } from "./state";

export function transitionToGameOver(state: GameState, cause: GameOverCause): GameState {
  if (state.mode === "gameover") return state;
  return {
    ...state,
    mode: "gameover",
    gameOverCause: cause,
    currentEventId: undefined,
    currentEncounterId: undefined,
    combatState: undefined,
  };
}

export function resolvePartyDefeat(state: GameState, cause: GameOverCause): GameState {
  if (state.party.members.length === 0) return state;
  return state.party.members.every((member) => !member.alive || member.stats.hp <= 0)
    ? transitionToGameOver(state, cause)
    : state;
}
