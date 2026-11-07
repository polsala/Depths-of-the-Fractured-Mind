import type { GameState } from "../state";
import type { GameEvent, GameEventChoice } from "./engine";
import { registerEvent } from "./engine";
import { applyEventEffect } from "./resolvers";
import { addItem, getItemCount, removeItem, ITEMS } from "../inventory";
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
function getChoiceBlockReason(choice: SerializableEventChoice, state: GameState): string | null {
  for (const [flag, required] of Object.entries(choice.requiresFlags ?? {})) {
    if (state.flags[flag] !== required) return `Requires ${flag} to be ${required}.`;
  }
  const requiredSanity = choice.requiresMinSanity;
  if (requiredSanity !== undefined) {
    const living = state.party.members.filter((member) => member.alive);
    if (living.some((member) => member.stats.sanity < requiredSanity)) {
      return `Requires ${requiredSanity} sanity for each living party member.`;
    }
  }
  for (const itemId of choice.requiresItems ?? []) {
    if (getItemCount(state.party.inventory, itemId) < 1) {
      return `Requires ${ITEMS[itemId]?.name ?? itemId}.`;
    }
  }

  // Simulate the whole inventory transaction before changing story flags,
  // health, morality, or the real inventory.
  const preview = {
    ...state.party.inventory,
    items: state.party.inventory.items.map((entry) => ({ ...entry })),
  };
  for (const itemId of choice.effects.removeItems ?? []) {
    if (!removeItem(preview, itemId)) return `Requires ${ITEMS[itemId]?.name ?? itemId}.`;
  }
  for (const itemId of choice.effects.addItems ?? []) {
    if (!addItem(preview, itemId)) return "Inventory is full; make room before choosing this reward.";
  }
  return null;
}

function convertChoice(choice: SerializableEventChoice): GameEventChoice {
  return {
    id: choice.id,
    label: choice.label,
    description: choice.description,
    requires: (state: GameState) => getChoiceBlockReason(choice, state) === null,
    unavailableReason: (state: GameState) => getChoiceBlockReason(choice, state),
    apply: (state: GameState) => {
      if (getChoiceBlockReason(choice, state)) return state;
      const inventory = {
        ...state.party.inventory,
        items: state.party.inventory.items.map((entry) => ({ ...entry })),
      };
      for (const itemId of choice.effects.removeItems ?? []) removeItem(inventory, itemId);
      for (const itemId of choice.effects.addItems ?? []) addItem(inventory, itemId);
      let nextState = applyEventEffect({
        ...state,
        party: { ...state.party, inventory },
      }, {
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
      
      // Handle HP delta
      if (choice.effects.hpDelta !== undefined) {
        nextState = {
          ...nextState,
          party: {
            ...nextState.party,
            members: nextState.party.members.map((member) => {
              if (!member.alive) return member;
              const newHp = Math.min(
                member.stats.maxHp,
                Math.max(0, member.stats.hp + choice.effects.hpDelta!)
              );
              return {
                ...member,
                stats: { ...member.stats, hp: newHp },
                alive: newHp > 0,
              };
            }),
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
    repeatable: serializableEvent.metadata?.repeatable === true,
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
