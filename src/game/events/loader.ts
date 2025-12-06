import type { GameState } from "../state";
import type { GameEvent, GameEventChoice } from "./engine";
import { registerEvent } from "./engine";
import { applyEventEffect } from "./resolvers";
import type {
  SerializableEvent,
  SerializableEventChoice,
  EventDataFile,
  EventMetadata,
  EventPool,
} from "./types";

/**
 * Storage for event metadata
 */
const EVENT_METADATA: Map<string, EventMetadata> = new Map();

/**
 * Storage for event pools
 */
const EVENT_POOLS: Map<string, EventPool> = new Map();

/**
 * Convert serializable choice to GameEventChoice
 */
function convertChoice(choice: SerializableEventChoice): GameEventChoice {
  return {
    id: choice.id,
    label: choice.label,
    description: choice.description,
    requires: choice.requiresFlags || choice.requiresMinSanity || choice.requiresItems
      ? (state: GameState) => {
          // Check flag requirements
          if (choice.requiresFlags) {
            for (const [flag, required] of Object.entries(choice.requiresFlags)) {
              const currentValue = (state.flags as Record<string, boolean>)[flag];
              if (currentValue !== required) {
                return false;
              }
            }
          }
          
          // Check sanity requirement
          if (choice.requiresMinSanity !== undefined) {
            const minSanity = Math.min(
              ...state.party.members.map((m) => m.stats.sanity)
            );
            if (minSanity < choice.requiresMinSanity) {
              return false;
            }
          }
          
          // TODO: Check item requirements when inventory is implemented
          
          return true;
        }
      : undefined,
    apply: (state: GameState) => {
      let nextState = applyEventEffect(state, {
        sanityDelta: choice.effects.sanityDelta,
        mercyDelta: choice.effects.mercyDelta,
        crueltyDelta: choice.effects.crueltyDelta,
        truthDelta: choice.effects.truthDelta,
        denialDelta: choice.effects.denialDelta,
        setFlags: choice.effects.setFlags,
        nextMode: choice.effects.nextEventId ? "event" : "exploration",
      });
      
      // Handle character death
      if (choice.effects.killCharacter) {
        nextState = {
          ...nextState,
          party: {
            ...nextState.party,
            members: nextState.party.members.map((member) =>
              member.id === choice.effects.killCharacter
                ? { ...member, alive: false, stats: { ...member.stats, hp: 0 } }
                : member
            ),
          },
        };
      }
      
      // Handle next event
      if (choice.effects.nextEventId) {
        nextState = {
          ...nextState,
          currentEventId: choice.effects.nextEventId,
        };
      } else {
        nextState = {
          ...nextState,
          currentEventId: undefined,
        };
      }
      
      return nextState;
    },
  };
}

/**
 * Convert serializable event to GameEvent
 */
function convertEvent(serializableEvent: SerializableEvent): GameEvent {
  return {
    id: serializableEvent.id,
    title: serializableEvent.title,
    description: serializableEvent.description,
    choices: serializableEvent.choices.map(convertChoice),
    nextEventId: serializableEvent.nextEventId,
  };
}

/**
 * Load events from a data file
 */
export async function loadEventDataFile(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load event data from ${url}: ${response.statusText}`);
    }
    
    const data: EventDataFile = await response.json();
    
    // Register all events
    for (const serializableEvent of data.events) {
      const gameEvent = convertEvent(serializableEvent);
      registerEvent(gameEvent);
      
      // Store metadata if provided
      if (serializableEvent.metadata) {
        EVENT_METADATA.set(serializableEvent.id, serializableEvent.metadata);
      }
    }
    
    // Register pools if provided
    if (data.pools) {
      for (const pool of data.pools) {
        EVENT_POOLS.set(pool.id, pool);
      }
    }
    
    console.log(`Loaded ${data.events.length} events from ${url}`);
  } catch (error) {
    console.error(`Error loading event data from ${url}:`, error);
    throw error;
  }
}

/**
 * Get event metadata
 */
export function getEventMetadata(eventId: string): EventMetadata | undefined {
  return EVENT_METADATA.get(eventId);
}

/**
 * Get event pool
 */
export function getEventPool(poolId: string): EventPool | undefined {
  return EVENT_POOLS.get(poolId);
}

/**
 * Get all event IDs in a pool
 */
export function getPoolEventIds(poolId: string): string[] {
  const pool = EVENT_POOLS.get(poolId);
  return pool ? pool.events : [];
}

/**
 * Get all registered pool IDs
 */
export function getAllPoolIds(): string[] {
  return Array.from(EVENT_POOLS.keys());
}

/**
 * Clear all loaded event data (useful for testing)
 */
export function clearEventData(): void {
  EVENT_METADATA.clear();
  EVENT_POOLS.clear();
}
