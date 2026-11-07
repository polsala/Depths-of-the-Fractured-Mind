import { getItemCount } from "./inventory";
import type { FinalDecision, GameState } from "./state";

export interface EndingOption {
  id: FinalDecision;
  label: string;
  description: string;
  unavailableReason: string | null;
}

export interface EndingResult {
  id: FinalDecision;
  title: string;
  narrative: readonly string[];
  consequences: string[];
  survivors: string[];
}

const REQUIRED_FLAGS = ["riotRecordingPlayed", "pitEventResolved", "overflowWardResolved", "confessionalUsed"] as const;

function witnessReady(state: GameState): boolean {
  return state.flags.completedEventIds?.has("first_corpse") === true &&
    REQUIRED_FLAGS.every((flag) => state.flags[flag] === true) &&
    state.flags.keeperLeadFollowed === true &&
    state.flags.wardPatientSaved === true &&
    state.flags.eliasSeekingRedemption === true &&
    state.flags.anyaSeeksRedemption === true &&
    state.party.members.some((member) => member.id === "subject13" && member.alive) &&
    state.flags.moral.truth >= 5 && state.flags.moral.mercy >= 3 &&
    getItemCount(state.party.inventory, "staff_memo") > 0;
}

export function getEndingOptions(state: GameState): EndingOption[] {
  const { moral } = state.flags;
  const options: EndingOption[] = [
    {
      id: "broadcast",
      label: "Broadcast the evidence",
      description: "Expose the Facility and the party's part in it.",
      unavailableReason: moral.truth < moral.denial + 2 || !state.flags.riotRecordingPlayed || !state.flags.confessionalUsed
        ? "Face the riot recording and confessions, and have at least two more Truth than Denial." : null,
    },
    {
      id: "evacuate",
      label: "Free the surviving patients",
      description: "Use the Engine's last power to open the wards.",
      unavailableReason: moral.mercy < moral.cruelty + 2 || state.flags.wardPatientSaved !== true
        ? "Save a patient in the Overflow Ward and have at least two more Mercy than Cruelty." : null,
    },
    {
      id: "seal",
      label: "Seal the Engine",
      description: "Contain the machine, even if its secrets remain buried.",
      unavailableReason: null,
    },
    {
      id: "bind",
      label: "Bind yourselves to the Engine",
      description: "Take control of the thing that made this place possible.",
      unavailableReason: null,
    },
  ];
  // The hidden route is not advertised until every prerequisite is met.
  if (witnessReady(state)) options.push({
    id: "witness",
    label: "Let Subject 13 bear witness",
    description: "Join the recovered evidence to every memory trapped in the Engine.",
    unavailableReason: null,
  });
  return options;
}

const SCENES: Record<FinalDecision, { title: string; narrative: readonly string[] }> = {
  broadcast: {
    title: "Testimony",
    narrative: [
      "The transmitters survive long enough to send the archive above ground. The names of patients and staff are heard together; there is no clean version of this history.",
      "The survivors leave as witnesses, not heroes. The city will decide what accountability means once the signal stops.",
    ],
  },
  evacuate: {
    title: "The Open Ward",
    narrative: [
      "The Engine's remaining charge opens the locked wards. The patients who can still walk follow the party toward daylight.",
      "The records are incomplete, and rescue cannot undo what was done. The living, at least, have another morning.",
    ],
  },
  seal: {
    title: "Containment",
    narrative: [
      "Steel shutters close over the Core. The pulse stops spreading, and the stairwells finally fall silent.",
      "Some evidence remains buried with the machine. The survivors must choose what to tell the world without its voice.",
    ],
  },
  bind: {
    title: "Inheritance",
    narrative: [
      "The party accepts the controls. The Engine answers with the voices it has kept, and the Facility takes on new custodians.",
      "They can restrain its cruelty or repeat it. Nothing in the machine will make that decision for them.",
    ],
  },
  witness: {
    title: "The Unbroken Witness",
    narrative: [
      "Subject 13 reads the hidden report aloud. The Keeper's clue, the patients' testimony and the party's confessions give the Engine no single guilt to exploit.",
      "The memory is released without erasing its owners. They walk out carrying a record that cannot be rewritten as a cure.",
    ],
  },
};

export function resolveEnding(state: GameState): EndingResult | null {
  if (state.mode !== "ending" || !state.finalDecision || !state.flags.bossDefeatedDepths?.has(5)) return null;
  if (!getEndingOptions(state).some((option) => option.id === state.finalDecision && !option.unavailableReason)) return null;
  const survivors = state.party.members.filter((member) => member.alive && member.stats.hp > 0).map((member) => member.name);
  if (survivors.length === 0) return null;
  const consequences = [
    state.flags.eliasSeekingRedemption ? "Elias acknowledged the riot orders." :
      state.flags.eliasInDenial || state.flags.eliasUnrepentant ? "Elias refused responsibility for the riot." : "The riot recording was heard.",
    state.flags.wardPatientSaved ? "A patient survived the Overflow Ward." :
      state.flags.wardPatientsKilled ? "Life support was shut down in the ward." : "The patients were left in the failing ward.",
    state.flags.anyaSeeksRedemption ? "Anya confessed to betraying her patients." :
      state.flags.anyaInDenial || state.flags.anyaAvoidant ? "Anya did not confess to the tapes." : "The confessional tapes were found.",
    state.flags.keeperLeadFollowed ? "The Keeper's hidden report was recovered." : "The Keeper's hidden report remained undiscovered.",
  ];
  return { id: state.finalDecision, ...SCENES[state.finalDecision], consequences, survivors };
}
