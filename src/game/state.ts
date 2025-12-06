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
  // Mandatory event flags
  pitEventResolved?: boolean;
  overflowWardResolved?: boolean;
  riotRecordingPlayed?: boolean;
  confessionalUsed?: boolean;
  
  // Additional event-specific flags
  wardPatientsKilled?: boolean;
  wardPatientSaved?: boolean;
  eliasInDenial?: boolean;
  eliasSeekingRedemption?: boolean;
  eliasUnrepentant?: boolean;
  anyaSeeksRedemption?: boolean;
  anyaInDenial?: boolean;
  anyaAvoidant?: boolean;
  whisperingTunnelExplored?: boolean;
  whisperingTunnelIgnored?: boolean;
  comfortedDyingPatient?: boolean;
  subject13AcceptsUncertainty?: boolean;
  subject13SeekingOrigin?: boolean;
  subject13ChosenNarrative?: boolean;
  miriamDestroyedEvidence?: boolean;
  miriamPreservedEvidence?: boolean;
  anyaMaintainsFaith?: boolean;
  anyaEmbracesDubt?: boolean;
  anyaLosesFaith?: boolean;
  
  // Allow dynamic flags for future expansion
  [key: string]: number | boolean | undefined | MoralFlags;
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
      x: 1,
      y: 1,
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
