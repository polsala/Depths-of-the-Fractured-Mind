import type { GameState } from "../state";
import type { EventTriggerConditions } from "./types";
import { getEventMetadata, getEventPool } from "./loader";

/**
 * Check if an event's trigger conditions are met
 */
export function checkTriggerConditions(
  conditions: EventTriggerConditions | undefined,
  state: GameState
): boolean {
  if (!conditions) {
    return true; // No conditions means always available
  }
  
  // Check depth requirements
  if (conditions.specificDepth !== undefined) {
    if (state.location.depth !== conditions.specificDepth) {
      return false;
    }
  }
  
  if (conditions.minDepth !== undefined) {
    if (state.location.depth < conditions.minDepth) {
      return false;
    }
  }
  
  if (conditions.maxDepth !== undefined) {
    if (state.location.depth > conditions.maxDepth) {
      return false;
    }
  }
  
  // Check flag requirements
  if (conditions.requiredFlags) {
    for (const [flag, required] of Object.entries(conditions.requiredFlags)) {
      const currentValue = (state.flags as Record<string, boolean>)[flag];
      if (currentValue !== required) {
        return false;
      }
    }
  }
  
  // Check moral alignment requirements
  if (conditions.minMercy !== undefined && state.flags.moral.mercy < conditions.minMercy) {
    return false;
  }
  
  if (conditions.minCruelty !== undefined && state.flags.moral.cruelty < conditions.minCruelty) {
    return false;
  }
  
  if (conditions.minTruth !== undefined && state.flags.moral.truth < conditions.minTruth) {
    return false;
  }
  
  if (conditions.minDenial !== undefined && state.flags.moral.denial < conditions.minDenial) {
    return false;
  }
  
  // Check party requirements
  if (conditions.requireAllAlive === true) {
    const allAlive = state.party.members.every((m) => m.alive);
    if (!allAlive) {
      return false;
    }
  }
  
  if (conditions.specificCharacterAlive) {
    const character = state.party.members.find(
      (m) => m.id === conditions.specificCharacterAlive
    );
    if (!character || !character.alive) {
      return false;
    }
  }
  
  // Check custom condition
  if (conditions.customCondition) {
    if (!conditions.customCondition(state)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get all available events for current game state
 */
export function getAvailableEvents(
  state: GameState,
  eventIds: string[]
): string[] {
  return eventIds.filter((eventId) => {
    const metadata = getEventMetadata(eventId);
    if (!metadata) {
      return true; // Events without metadata are always available
    }
    
    return checkTriggerConditions(metadata.triggerConditions, state);
  });
}

/**
 * Select a random event from available events
 */
export function selectRandomEvent(
  state: GameState,
  eventIds: string[]
): string | null {
  const available = getAvailableEvents(state, eventIds);
  
  if (available.length === 0) {
    return null;
  }
  
  // Use weighted selection based on priority
  const weights: number[] = [];
  let totalWeight = 0;
  
  for (const eventId of available) {
    const metadata = getEventMetadata(eventId);
    const priority = metadata?.priority ?? 1;
    weights.push(priority);
    totalWeight += priority;
  }
  
  // Random selection
  let random = Math.random() * totalWeight;
  for (let i = 0; i < available.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return available[i];
    }
  }
  
  // Fallback to last event
  return available[available.length - 1];
}

/**
 * Select an event from a pool
 */
export function selectEventFromPool(
  state: GameState,
  poolId: string
): string | null {
  const pool = getEventPool(poolId);
  if (!pool) {
    console.warn(`Event pool '${poolId}' not found`);
    return null;
  }
  
  const available = getAvailableEvents(state, pool.events);
  
  if (available.length === 0) {
    return null;
  }
  
  switch (pool.selectionStrategy) {
    case "random":
    case "weighted":
      return selectRandomEvent(state, pool.events);
    
    case "sequential":
      // Return the first available event in order
      return available[0];
    
    default:
      return selectRandomEvent(state, pool.events);
  }
}

/**
 * Get mandatory events that haven't been completed yet
 */
export function getIncompleteMandatoryEvents(state: GameState): string[] {
  const mandatoryFlags = [
    { id: "pit_fall_event", flag: "pitEventResolved" },
    { id: "overflow_ward_event", flag: "overflowWardResolved" },
    { id: "riot_recording_event", flag: "riotRecordingPlayed" },
    { id: "confessional_chair_event", flag: "confessionalUsed" },
  ];
  
  return mandatoryFlags
    .filter(({ flag }) => !(state.flags as Record<string, boolean>)[flag])
    .map(({ id }) => id);
}

/**
 * Determine which event should trigger at current location
 * This is the main procedural event selection function
 */
export function selectEventForLocation(state: GameState): string | null {
  // First, check for incomplete mandatory events appropriate for this depth
  const incompleteMandatory = getIncompleteMandatoryEvents(state);
  const availableMandatory = getAvailableEvents(state, incompleteMandatory);
  
  if (availableMandatory.length > 0) {
    // Mandatory events have priority
    return selectRandomEvent(state, availableMandatory);
  }
  
  // Otherwise, select from optional events pool
  const depthPoolId = `depth_${state.location.depth}_events`;
  const depthEvent = selectEventFromPool(state, depthPoolId);
  
  if (depthEvent) {
    return depthEvent;
  }
  
  // Fall back to general optional events
  return selectEventFromPool(state, "optional_events");
}
