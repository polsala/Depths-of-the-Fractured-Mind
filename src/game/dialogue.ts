import type { GameState } from "./state";

export interface DialogueLine {
  speaker: "narrator" | "elias" | "miriam" | "subject13" | "anya" | "unknown";
  text: string;
  emotion?: "calm" | "fearful" | "angry" | "confused" | "sad" | "cryptic";
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextDialogueId?: string;
  nextEventId?: string;
  eventId?: string;
  effects?: {
    sanityDelta?: number;
    mercyDelta?: number;
    crueltyDelta?: number;
    truthDelta?: number;
    denialDelta?: number;
  };
}

export interface Dialogue {
  id: string;
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  autoAdvance?: boolean;
  nextDialogueId?: string;
  nextEventId?: string;
}

const INTRO_DIALOGUE: Dialogue = {
  id: "game_intro",
  lines: [
    {
      speaker: "narrator",
      text: "The Facility. A name whispered in hushed tones by those who knew its true purpose.",
    },
    {
      speaker: "narrator",
      text: "Beneath the streets of an unnamed city, it sprawled like a cancerous growth - part psychiatric ward, part research laboratory, part detention complex.",
    },
    {
      speaker: "narrator",
      text: "They called it 'The Engine' - a device meant to externalize and cleanse collective guilt and trauma.",
    },
    {
      speaker: "narrator",
      text: "Instead, it amplified them. Manifested them. Made them real.",
    },
    {
      speaker: "narrator",
      text: "The catastrophe came swiftly. Subject 13, the focal point of the final experiment, became the catalyst for everything that followed.",
    },
    {
      speaker: "narrator",
      text: "Power surges. Lockdowns malfunctioned. Patients and staff died, mutated, or shattered.",
    },
    {
      speaker: "narrator",
      text: "Now, four survivors converge at the threshold. Each bears their own guilt. Each must descend.",
    },
  ],
  autoAdvance: true,
  nextDialogueId: "depth1_start",
};

const DEPTH1_START: Dialogue = {
  id: "depth1_start",
  lines: [
    {
      speaker: "elias",
      text: "The entrance is sealed behind us. No turning back now.",
      emotion: "calm",
    },
    {
      speaker: "miriam",
      text: "The air quality readings are... concerning. Biological contamination is likely.",
      emotion: "calm",
    },
    {
      speaker: "subject13",
      text: "I've been here before. Or I will be. Time doesn't flow right anymore.",
      emotion: "cryptic",
    },
    {
      speaker: "anya",
      text: "God have mercy on us all. We've earned whatever awaits below.",
      emotion: "sad",
    },
  ],
  choices: [
    {
      id: "acknowledge_guilt",
      text: "We're all responsible for what happened here.",
      effects: {
        truthDelta: 1,
      },
    },
    {
      id: "focus_survival",
      text: "Focus on survival. The past doesn't matter now.",
      effects: {
        denialDelta: 1,
      },
    },
    {
      id: "seek_redemption",
      text: "Maybe we can still make this right.",
      effects: {
        mercyDelta: 1,
      },
    },
  ],
};

const EVENT_DIALOGUES: Record<string, Dialogue> = {
  pit_fall_pre: {
    id: "pit_fall_pre",
    lines: [
      {
        speaker: "narrator",
        text: "The corridor ahead looks unstable. Cracks spiderweb across the floor.",
      },
      {
        speaker: "elias",
        text: "Watch your step. This whole section could give way.",
        emotion: "calm",
      },
      {
        speaker: "miriam",
        text: "The structural integrity has clearly been compromised.",
        emotion: "calm",
      },
    ],
    nextEventId: "pit_fall_event",
  },
  overflow_ward_pre: {
    id: "overflow_ward_pre",
    lines: [
      {
        speaker: "narrator",
        text: "The ward is ahead. Weak beeping echoes through the corridor.",
      },
      {
        speaker: "miriam",
        text: "Life support systems. Multiple patients... barely functioning.",
        emotion: "calm",
      },
      {
        speaker: "anya",
        text: "Are they... can they be saved?",
        emotion: "fearful",
      },
      {
        speaker: "miriam",
        text: "The machinery is failing. I'm not sure there's anything we can do.",
        emotion: "sad",
      },
    ],
    choices: [
      {
        id: "enter_ward",
        text: "We should try to help them.",
        nextEventId: "overflow_ward_event",
      },
      {
        id: "avoid_ward",
        text: "It's too late for them. We need to keep moving.",
        effects: {
          crueltyDelta: 1,
          denialDelta: 1,
        },
      },
    ],
  },
  riot_recording_pre: {
    id: "riot_recording_pre",
    lines: [
      {
        speaker: "narrator",
        text: "An old tape recorder sits on a desk, surrounded by scattered files.",
      },
      {
        speaker: "elias",
        text: "The Archive. This is where they kept all the... records.",
        emotion: "calm",
      },
      {
        speaker: "subject13",
        text: "Listen to it. You need to hear the truth.",
        emotion: "cryptic",
      },
    ],
    choices: [
      {
        id: "play_recording",
        text: "Play the recording.",
        nextEventId: "riot_recording_event",
      },
      {
        id: "destroy_recording",
        text: "Destroy it. The past should stay buried.",
        effects: {
          denialDelta: 2,
        },
      },
    ],
  },
  confessional_pre: {
    id: "confessional_pre",
    lines: [
      {
        speaker: "narrator",
        text: "A chair sits in the center of the room, surrounded by recording equipment.",
      },
      {
        speaker: "anya",
        text: "The confessional chair. I remember... every session.",
        emotion: "sad",
      },
      {
        speaker: "subject13",
        text: "They used your words against us. Your compassion became their weapon.",
        emotion: "angry",
      },
    ],
    nextEventId: "confessional_chair_event",
  },
};

const DIALOGUES: Record<string, Dialogue> = {
  game_intro: INTRO_DIALOGUE,
  depth1_start: DEPTH1_START,
  ...EVENT_DIALOGUES,
};

export function getDialogue(id: string): Dialogue | undefined {
  return DIALOGUES[id];
}

export function shouldShowDialogue(state: GameState, dialogueId: string): boolean {
  // Check if dialogue has already been shown
  const dialogueKey = `dialogue_${dialogueId}_shown`;
  return !state.flags[dialogueKey];
}

export function markDialogueShown(state: GameState, dialogueId: string): void {
  const dialogueKey = `dialogue_${dialogueId}_shown`;
  state.flags[dialogueKey] = true;
}
