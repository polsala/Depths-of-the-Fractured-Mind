import type { GameFlags, GameMode, GameState, PartyState } from "../state";
import { adjustMoralFlags, adjustPartySanity } from "../sanity";

export interface EventEffect {
  sanityDelta?: number;
  mercyDelta?: number;
  crueltyDelta?: number;
  truthDelta?: number;
  denialDelta?: number;
  setFlags?: Partial<GameFlags>;
  nextMode?: GameMode;
  partyTransform?: (party: PartyState) => PartyState;
}

export function applyEventEffect(
  state: GameState,
  effect: EventEffect
): GameState {
  let nextState: GameState = state;

  if (typeof effect.sanityDelta === "number") {
    nextState = {
      ...nextState,
      party: adjustPartySanity(nextState.party, effect.sanityDelta),
    };
  }

  const hasMoralChange =
    effect.mercyDelta !== undefined ||
    effect.crueltyDelta !== undefined ||
    effect.truthDelta !== undefined ||
    effect.denialDelta !== undefined;

  if (hasMoralChange) {
    nextState = {
      ...nextState,
      flags: {
        ...nextState.flags,
        moral: adjustMoralFlags(nextState.flags.moral, {
          mercy: effect.mercyDelta ?? 0,
          cruelty: effect.crueltyDelta ?? 0,
          truth: effect.truthDelta ?? 0,
          denial: effect.denialDelta ?? 0,
        }),
      },
    };
  }

  if (effect.partyTransform) {
    nextState = {
      ...nextState,
      party: effect.partyTransform(nextState.party),
    };
  }

  if (effect.setFlags) {
    nextState = {
      ...nextState,
      flags: {
        ...nextState.flags,
        ...effect.setFlags,
      },
    };
  }

  if (effect.nextMode) {
    nextState = {
      ...nextState,
      mode: effect.nextMode,
    };
  }

  return nextState;
}
