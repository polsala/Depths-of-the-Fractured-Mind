import type { GameState } from "../state";

/**
 * Trigger conditions determine when an event can appear
 */
export interface EventTriggerConditions {
  // Depth range where event can trigger
  minDepth?: number;
  maxDepth?: number;
  specificDepth?: number;
  
  // Flag requirements
  requiredFlags?: Partial<Record<string, boolean>>;
  
  // Moral alignment requirements
  minMercy?: number;
  minCruelty?: number;
  minTruth?: number;
  minDenial?: number;
  
  // Party requirements
  requireAllAlive?: boolean;
  specificCharacterAlive?: string;
  
  // Location requirements
  locationTag?: string;
  
  // Custom condition function
  customCondition?: (state: GameState) => boolean;
}

/**
 * Event metadata for procedural generation
 */
export interface EventMetadata {
  // Unique identifier
  id: string;
  
  // Event category
  category: "mandatory" | "optional" | "character_specific" | "environmental";
  
  // Character focus (if any)
  characterFocus?: "elias" | "miriam" | "subject13" | "anya";
  
  // Trigger conditions
  triggerConditions?: EventTriggerConditions;
  
  // Priority for procedural selection (higher = more likely)
  priority?: number;
  
  // Can this event repeat?
  repeatable?: boolean;
  
  // Pool tags for grouping events
  poolTags?: string[];
}

/**
 * Serializable event choice for JSON
 */
export interface SerializableEventChoice {
  id: string;
  label: string;
  description?: string;
  
  // Requirements for this choice to be available
  requiresFlags?: Record<string, boolean>;
  requiresMinSanity?: number;
  requiresItems?: string[];
  
  // Effects of choosing this option
  effects: {
    sanityDelta?: number;
    hpDelta?: number;
    mercyDelta?: number;
    crueltyDelta?: number;
    truthDelta?: number;
    denialDelta?: number;
    setFlags?: Record<string, boolean>;
    removeItems?: string[];
    addItems?: string[];
    killCharacter?: string;
    nextEventId?: string;
  };
}

/**
 * Serializable event definition for JSON
 */
export interface SerializableEvent {
  id: string;
  title: string;
  description: string;
  choices: SerializableEventChoice[];
  nextEventId?: string;
  metadata?: EventMetadata;
}

/**
 * Event pool for procedural generation
 */
export interface EventPool {
  id: string;
  name: string;
  description: string;
  events: string[]; // Event IDs
  selectionStrategy: "random" | "weighted" | "sequential";
}

/**
 * Complete event data structure for JSON files
 */
export interface EventDataFile {
  version: string;
  events: SerializableEvent[];
  pools?: EventPool[];
}
