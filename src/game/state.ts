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
  
  // Exploration flags
  visitedTiles?: Set<string>;
  
  // Allow dynamic flags for future expansion
  [key: string]: number | boolean | undefined | MoralFlags | Set<string>;
}

export interface CharacterState {
  id: CharacterId;
  name: string;
  stats: Stats;
  statusEffects: string[];
  alive: boolean;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: "consumable" | "key" | "lore" | "utility";
  stackable: boolean;
  usable: boolean;
}

export interface InventoryItem {
  item: Item;
  quantity: number;
}

export interface Inventory {
  items: InventoryItem[];
  maxSlots: number;
}

export interface PartyState {
  members: CharacterState[];
  inventory: Inventory;
}

export interface GameLocation {
  depth: number;
  x: number;
  y: number;
  direction?: "north" | "south" | "east" | "west";
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
      inventory: {
        items: [],
        maxSlots: 20,
      },
    },
    location: {
      depth: 1,
      x: 1,
      y: 1,
      direction: "north",
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
      visitedTiles: new Set<string>(),
    },
    currentEventId: undefined,
    currentEncounterId: undefined,
  };
}
