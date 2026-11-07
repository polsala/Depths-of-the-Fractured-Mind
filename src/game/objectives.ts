import type { GameState } from "./state";
import { nextRequiredBeat } from "./story";

export const CHAPTERS = ["", "The Threshold", "The Archive", "The Ward", "The Labyrinth", "The Core"] as const;

const BEAT_HINTS: Record<string, string> = {
  first_corpse: "The First Body",
  riot_recording_event: "the Riot Recording",
  pit_fall_event: "the Broken Floor",
  overflow_ward_event: "the Overflow Ward",
  confessional_chair_event: "the Confessional Chair",
};

export interface Objective {
  chapter: string;
  title: string;
  guidance: string;
  consequence: string | null;
}

export function getStoryConsequence(state: GameState): string | null {
  const flags = state.flags;
  if (state.location.depth <= 2) {
    if (flags.first_corpse_examined) return "You examined the first body. Its unwounded face made the Facility's silence harder to trust.";
    if (flags.respects_paid) return "You honored the first body. A small act of mercy followed you down.";
    if (flags.corpse_looted) return "You took supplies from the first body. Survival has already asked its price.";
  }
  if (state.location.depth === 3) {
    if (flags.eliasSeekingRedemption) return "Elias admitted the riot orders. The recording can no longer be explained away.";
    if (flags.eliasInDenial || flags.eliasUnrepentant) return "Elias rejected what the riot recording revealed.";
  }
  if (state.location.depth === 4) {
    if (flags.wardPatientSaved) return "A patient survived because you stayed in the Overflow Ward.";
    if (flags.wardPatientsKilled) return "The life-support machines went quiet at your command.";
  }
  if (state.location.depth === 5) {
    if (flags.anyaSeeksRedemption) return "Anya confessed after hearing the tapes.";
    if (flags.anyaInDenial || flags.anyaAvoidant) return "Anya left the tapes without an honest confession.";
  }
  return null;
}

export function getCurrentObjective(state: GameState): Objective {
  const depth = state.location.depth;
  const chapter = `Depth ${depth} · ${CHAPTERS[depth] ?? "The Facility"}`;
  const consequence = getStoryConsequence(state);
  if (depth === 1 && !state.flags.dialogue_keeper_intro_shown) {
    return {
      chapter,
      title: "Find a witness and the way down",
      guidance: "The Keeper stands beside the entrance; use Talk or T. Explore gold event markers, then seek the red downward stair. The first evidence cannot be skipped.",
      consequence,
    };
  }
  const beat = nextRequiredBeat(state);
  if (beat) {
    return {
      chapter,
      title: `Confront ${BEAT_HINTS[beat] ?? "the evidence"}`,
      guidance: "Explore for supplies and optional stories. The red downward stair will confront any unresolved evidence before the guardian.",
      consequence,
    };
  }
  if (!state.flags.bossDefeatedDepths?.has(depth)) {
    return {
      chapter,
      title: depth === 5 ? "Face the Engine Heart" : "Face the guardian at the downward stair",
      guidance: "Prepare your party, then step onto the red stair marker. Boss fights cannot be fled. Victory carries you onward automatically.",
      consequence,
    };
  }
  return { chapter, title: "Descend", guidance: "Return to the red stair to continue.", consequence };
}
