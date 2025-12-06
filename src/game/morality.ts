import { adjustMoralFlags } from "./sanity";
import type { GameFlags, GameState, MoralFlags } from "./state";

function updateMoral(
  state: GameState,
  changes: Partial<MoralFlags>
): GameState {
  const nextMoral = adjustMoralFlags(state.flags.moral, changes);
  const nextFlags: GameFlags = {
    ...state.flags,
    moral: nextMoral,
  };

  return {
    ...state,
    flags: nextFlags,
  };
}

export function addMercy(state: GameState, amount: number): GameState {
  return updateMoral(state, { mercy: amount });
}

export function addCruelty(state: GameState, amount: number): GameState {
  return updateMoral(state, { cruelty: amount });
}

export function addTruth(state: GameState, amount: number): GameState {
  return updateMoral(state, { truth: amount });
}

export function addDenial(state: GameState, amount: number): GameState {
  return updateMoral(state, { denial: amount });
}

export function getDominantMoralAxis(
  flags: MoralFlags
): "mercy" | "cruelty" | "truth" | "denial" | "balanced" {
  const entries: Array<["mercy" | "cruelty" | "truth" | "denial", number]> = [
    ["mercy", flags.mercy],
    ["cruelty", flags.cruelty],
    ["truth", flags.truth],
    ["denial", flags.denial],
  ];

  let dominant: "mercy" | "cruelty" | "truth" | "denial" | null = null;
  let maxAbs = 0;

  for (const [key, value] of entries) {
    const abs = Math.abs(value);
    if (abs > maxAbs) {
      dominant = key;
      maxAbs = abs;
    }
  }

  return maxAbs === 0 || dominant === null ? "balanced" : dominant;
}
