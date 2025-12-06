export interface Stats {
  hp: number;
  maxHp: number;
  sanity: number;
  maxSanity: number;
  attack: number;
  defense: number;
  will: number;
  focus: number;
}

export type CharacterId = "elias" | "miriam" | "subject13" | "anya";

export interface MoralFlags {
  mercy: number;
  cruelty: number;
  truth: number;
  denial: number;
}

export interface GameFlags {
  moral: MoralFlags;
  pitEventResolved?: boolean;
  overflowWardResolved?: boolean;
  riotRecordingPlayed?: boolean;
  confessionalUsed?: boolean;
}

export interface CharacterState {
  id: CharacterId;
  name: string;
  stats: Stats;
  statusEffects: string[];
  alive: boolean;
}

export interface PartyState {
  members: CharacterState[];
}

export interface GameLocation {
  depth: number;
  x: number;
  y: number;
}

export type GameMode =
  | "title"
  | "exploration"
  | "combat"
  | "event"
  | "conversation"
  | "ending"
  | "pause";

export interface GameState {
  party: PartyState;
  location: GameLocation;
  mode: GameMode;
  flags: GameFlags;
  currentEventId?: string;
  currentEncounterId?: string;
}

export function createInitialGameState(): GameState {
  return {
    party: {
      members: [],
    },
    location: {
      depth: 1,
      x: 0,
      y: 0,
    },
    mode: "title",
    flags: {
      moral: {
        mercy: 0,
        cruelty: 0,
        truth: 0,
        denial: 0,
      },
      pitEventResolved: false,
      overflowWardResolved: false,
      riotRecordingPlayed: false,
      confessionalUsed: false,
    },
    currentEventId: undefined,
    currentEncounterId: undefined,
  };
}
