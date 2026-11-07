import type { GameState } from "../state";
import type { GameEvent, GameEventChoice } from "./engine";
import { registerEvent } from "./engine";
import { applyEventEffect, type EventEffect } from "./resolvers";

function withEffect(effect: EventEffect): (state: GameState) => GameState {
  return (state: GameState) => applyEventEffect(state, effect);
}

function makeChoice(
  choice: Omit<GameEventChoice, "apply"> & { effect: EventEffect }
): GameEventChoice {
  const { effect, ...rest } = choice;
  return {
    ...rest,
    apply: withEffect(effect),
  };
}

/**
 * Legacy hardcoded events for backward compatibility.
 * These serve as fallbacks if JSON loading fails.
 * They use the same IDs as the JSON versions to maintain compatibility.
 */
const FALLBACK_EVENTS: Record<string, GameEvent> = {
  first_corpse: {
    id: "first_corpse",
    title: "The First Body",
    description: "A facility worker lies beside the stair. The absence of wounds is more frightening than any blood.",
    choices: [
      makeChoice({ id: "examine_body", label: "Examine the body", effect: {
        truthDelta: 1, sanityDelta: -2, setFlags: { first_corpse_examined: true }, nextMode: "exploration",
      } }),
      makeChoice({ id: "pay_respects", label: "Pay respects and move on", effect: {
        mercyDelta: 1, sanityDelta: -1, setFlags: { respects_paid: true }, nextMode: "exploration",
      } }),
    ],
  },
  pit_fall_event: {
    id: "pit_fall_event",
    title: "The Broken Floor",
    description:
      "A section of the corridor collapses under a party member. Their scream fades into the darkness below. The rest of the party peers down into the jagged shaft.",
    choices: [
      makeChoice({
        id: "risky_rescue",
        label: "Use rope for a risky rescue",
        description:
          "Tie a rope and descend quickly, hoping the anchor holds. Fear gnaws at everyone.",
        effect: {
          mercyDelta: 1,
          truthDelta: 1,
          sanityDelta: -2,
          setFlags: { pitEventResolved: true },
          nextMode: "exploration",
        },
      }),
      makeChoice({
        id: "abandon",
        label: "Leave them behind",
        description:
          "The descent is too dangerous. You turn away, leaving their cries behind.",
        effect: {
          crueltyDelta: 3,
          sanityDelta: -3,
          setFlags: { pitEventResolved: true },
          nextMode: "exploration",
        },
      }),
      makeChoice({
        id: "careful_rescue",
        label: "Take time to build a safe rescue",
        description:
          "Rig a harness and brace the rope with scavenged metal. It costs time, but it might save them.",
        effect: {
          mercyDelta: 3,
          truthDelta: 1,
          sanityDelta: -1,
          setFlags: { pitEventResolved: true },
          nextMode: "exploration",
        },
      }),
      makeChoice({
        id: "mercy_kill",
        label: "End their suffering",
        description:
          "A hard decision: silence the pain from above. The echo of the blow lingers.",
        effect: {
          crueltyDelta: 3,
          mercyDelta: 1,
          sanityDelta: -4,
          setFlags: { pitEventResolved: true },
          nextMode: "exploration",
        },
      }),
    ],
  },
  riot_recording_event: {
    id: "riot_recording_event",
    title: "Riot Recording",
    description: "A surviving tape records the orders given during the ward riot.",
    choices: [makeChoice({ id: "listen", label: "Listen and acknowledge the recording", effect: {
      truthDelta: 1, setFlags: { riotRecordingPlayed: true }, nextMode: "exploration",
    } })],
  },
  overflow_ward_event: {
    id: "overflow_ward_event",
    title: "Overflow Ward",
    description: "Failing life-support machines surround the remaining patients.",
    choices: [makeChoice({ id: "attend", label: "Attend to the patients", effect: {
      mercyDelta: 1, setFlags: { overflowWardResolved: true }, nextMode: "exploration",
    } })],
  },
  confessional_chair_event: {
    id: "confessional_chair_event",
    title: "The Confessional Chair",
    description: "Recorded confessions reveal the facility's abuse of trust.",
    choices: [makeChoice({ id: "listen", label: "Hear the confessions", effect: {
      truthDelta: 1, setFlags: { confessionalUsed: true }, nextMode: "exploration",
    } })],
  },
};

/**
 * Register legacy mandatory events for backward compatibility.
 * These are fallbacks registered early, before JSON data loads.
 * If the same event ID is registered from JSON later, it will override these.
 */
export function registerMandatoryEvents(): void {
  Object.values(FALLBACK_EVENTS).forEach(event => {
    registerEvent(event);
  });
  console.log(`Registered ${Object.keys(FALLBACK_EVENTS).length} fallback events`);
}
