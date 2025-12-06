import { adjustMoralFlags } from "./sanity";
import { GameFlags, GameState, MoralFlags } from "./state";

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

  const { key, value } = entries.reduce(
    (acc, [k, v]) => {
      const abs = Math.abs(v);
      if (abs > acc.abs) {
        return { key: k, value: v, abs };
      }
      return acc;
    },
    { key: "mercy" as const, value: flags.mercy, abs: Math.abs(flags.mercy) }
  );

  return Math.abs(value) === 0 ? "balanced" : key;
}
