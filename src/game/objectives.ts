import type { GameState } from "./state";
import { nextRequiredBeat } from "./story";
import { isIntakeMap } from "./exploration/authored/depth1-intake";

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
  if (isIntakeMap(state.depthMaps?.get(depth))) {
    if (!state.flags.dialogue_keeper_intro_shown) return { chapter, title: "Find a witness and the way down",
      guidance: "Talk to the Keeper beside you with T. Read the amber patient counter to the north; the eastern passage leads to release control.", consequence };
    if (!state.flags.intakePowerRestored) return { chapter, title: "Restore the release circuit",
      guidance: "Follow the queue passage east, then north. The amber cable leads from the locked shutter to the eastern breaker booth.", consequence };
    if (!state.flags.completedEventIds?.has("first_corpse")) return { chapter, title: "Confront The First Body",
      guidance: "The shutter is open. Enter the evidence bay to the north and inspect the worker beside the admission chair.", consequence };
    if (!state.flags.intakeTagRecovered) return { chapter, title: "Recover Mara's intake tag",
      guidance: "Prepare your party, then interact with the body to confront the guard and rat. Their intentions will be shown before you act.", consequence };
    if (!state.flags.intakeComplete) return { chapter, title: "Return a name to Admissions",
      guidance: "Retrace the open shutter and queue passage. Place Mara Voss's tag in the amber counter on the north wall of Admissions.", consequence };
    return { chapter, title: "Mara Voss — released",
      guidance: "The counter opens the western descent. Prepare your party, then step onto the stair to face the Threshold's guardian.",
      consequence: state.flags.intakePerceptionAcknowledged ? "You listened to the queue's echo. Mara's name has replaced a number." : "Mara's name has replaced a number." };
  }
  if (depth === 2 && state.depthMaps?.get(2)?.environment) {
    const beat = nextRequiredBeat(state);
    if (beat === "riot_recording_event") return { chapter, title: "Recover the account of the riot",
      guidance: "Follow INDEX through the filing galleries to the open records drum. RETRIEVAL leads to the recording desk. The lever at INDEX releases optional restricted evidence storage.", consequence };
    if (beat === "pit_fall_event") return { chapter, title: "Cross the damaged service storage",
      guidance: "Return to the drum with the missing segment. Follow SERVICE to the broken floor; the damaged storage leads onward to WARD TRANSFER.", consequence };
    return { chapter, title: state.flags.bossDefeatedDepths?.has(2) ? "Continue to the Ward" : "Face the Archive's guardian",
      guidance: "Both accounts have been confronted. Follow WARD TRANSFER beyond damaged storage. Prepare supplies before stepping onto the downward stair; guardian combat cannot be fled.", consequence };
  }
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
