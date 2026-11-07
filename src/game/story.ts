import type { GameState } from "./state";

// A stair is the chapter boundary. Optional events may vary, but these beats
// must be resolved before the next boss/level can begin.
export const REQUIRED_BEATS: Partial<Record<number, readonly { id: string; flag: string }[]>> = {
  2: [
    { id: "riot_recording_event", flag: "riotRecordingPlayed" },
    { id: "pit_fall_event", flag: "pitEventResolved" },
  ],
  3: [{ id: "overflow_ward_event", flag: "overflowWardResolved" }],
  4: [{ id: "confessional_chair_event", flag: "confessionalUsed" }],
};

export function nextRequiredBeat(state: GameState): string | null {
  const beats = REQUIRED_BEATS[state.location.depth] ?? [];
  return beats.find(({ id, flag }) =>
    state.flags[flag] !== true && !state.flags.completedEventIds?.has(id)
  )?.id ?? null;
}

export function isRequiredBeat(id: string): boolean {
  return Object.values(REQUIRED_BEATS).some((beats) => beats?.some((beat) => beat.id === id));
}
