/**
 * Example Integration: Procedural Event System
 * 
 * This file demonstrates how to integrate the procedural event system
 * into the game loop and exploration mechanics.
 */

import { GameController } from "../index";

/**
 * Example 1: Triggering Events on Specific Tiles
 * 
 * This shows how to trigger events when the player steps on special tiles.
 */
export function handleTileEvent(gameController: GameController, tileType: string): void {
  if (tileType === 'event_trigger') {
    // Trigger a procedurally selected event appropriate for current game state
    gameController.triggerProceduralEvent();
  }
}

/**
 * Example 2: Random Encounter System
 * 
 * This shows how to implement random event encounters during exploration.
 */
export function checkRandomEvent(
  gameController: GameController,
  encounterChance: number = 0.1
): void {
  // 10% chance per step by default
  if (Math.random() < encounterChance) {
    gameController.triggerProceduralEvent();
  }
}

/**
 * Example 3: Depth-Based Event Triggering
 * 
 * Trigger an event when entering a new depth for the first time.
 */
export function onDepthEntered(
  gameController: GameController,
  depth: number,
  visitedDepths: Set<number>
): void {
  if (!visitedDepths.has(depth)) {
    // Mark this depth as visited
    visitedDepths.add(depth);
    
    // Trigger an event for this depth
    gameController.triggerProceduralEvent();
  }
}

/**
 * Example 4: Post-Combat Event
 * 
 * Trigger an event after winning a combat encounter.
 */
export function onCombatVictory(
  gameController: GameController,
  wasHardFight: boolean
): void {
  // Higher chance of event after difficult battles
  const eventChance = wasHardFight ? 0.5 : 0.2;
  
  if (Math.random() < eventChance) {
    gameController.triggerProceduralEvent();
  }
}

/**
 * Example 5: Story Checkpoint Events
 * 
 * Force a specific event at a story checkpoint.
 */
export function triggerStoryCheckpoint(
  gameController: GameController,
  checkpointId: string
): void {
  // Map checkpoint IDs to event IDs
  const checkpointEvents: Record<string, string> = {
    'archive_entrance': 'riot_recording_event',
    'ward_discovery': 'overflow_ward_event',
    'confession_room': 'confessional_chair_event',
  };
  
  const eventId = checkpointEvents[checkpointId];
  if (eventId) {
    // Start a specific event
    gameController.startEvent(eventId);
  }
}

/**
 * Example 6: Event Queue System
 * 
 * Queue events to trigger in sequence.
 */
export class EventQueue {
  private queue: string[] = [];
  
  public enqueue(eventId: string): void {
    this.queue.push(eventId);
  }
  
  public processNext(gameController: GameController): boolean {
    const eventId = this.queue.shift();
    if (eventId) {
      gameController.startEvent(eventId);
      return true;
    }
    return false;
  }
  
  public hasEvents(): boolean {
    return this.queue.length > 0;
  }
}

/**
 * Example 7: Conditional Event Triggering
 * 
 * Trigger events based on complex game state conditions.
 */
export function checkConditionalEvents(gameController: GameController): void {
  const state = gameController.getState();
  
  // Example: Trigger special event if party is low on sanity
  const averageSanity = state.party.members.reduce(
    (sum: number, member) => sum + member.stats.sanity,
    0
  ) / state.party.members.length;
  
  if (averageSanity < 30) {
    // Trigger a sanity-related event
    // This would need to be defined in events.json
    gameController.startEvent('low_sanity_crisis');
  }
  
  // Example: Trigger event if moral alignment reaches threshold
  if (state.flags.moral.cruelty > 10) {
    gameController.startEvent('cruelty_consequence');
  }
}

/**
 * Example 8: Event Cooldown System
 * 
 * Prevent events from triggering too frequently.
 */
export class EventCooldown {
  private lastEventStep: number = 0;
  private minStepsBetweenEvents: number = 10;
  
  constructor(minStepsBetweenEvents: number = 10) {
    this.minStepsBetweenEvents = minStepsBetweenEvents;
  }
  
  public canTriggerEvent(currentStep: number): boolean {
    return currentStep - this.lastEventStep >= this.minStepsBetweenEvents;
  }
  
  public recordEventTriggered(currentStep: number): void {
    this.lastEventStep = currentStep;
  }
  
  public tryTriggerEvent(
    gameController: GameController,
    currentStep: number,
    encounterChance: number = 0.1
  ): boolean {
    if (this.canTriggerEvent(currentStep) && Math.random() < encounterChance) {
      gameController.triggerProceduralEvent();
      this.recordEventTriggered(currentStep);
      return true;
    }
    return false;
  }
}

/**
 * Example 9: Integration with Exploration Loop
 * 
 * Complete example of event system in exploration loop.
 */
export function explorationStep(
  gameController: GameController,
  eventCooldown: EventCooldown,
  currentStep: number,
  currentTileType: string
): void {
  const state = gameController.getState();
  
  // Don't trigger events during combat or other non-exploration modes
  if (state.mode !== 'exploration') {
    return;
  }
  
  // Check for event tile
  if (currentTileType === 'event_trigger') {
    gameController.triggerProceduralEvent();
    return;
  }
  
  // Check for random encounter (with cooldown)
  eventCooldown.tryTriggerEvent(gameController, currentStep, 0.08);
}

/**
 * Example 10: Testing Event System
 * 
 * Helper function to test events during development.
 */
export function testEventSystem(gameController: GameController): void {
  console.log('=== Event System Test ===');
  
  // Wait for events to load
  const checkLoaded = setInterval(() => {
    if (gameController.isEventsLoaded()) {
      clearInterval(checkLoaded);
      
      console.log('Events loaded successfully');
      
      // Trigger a procedural event
      console.log('Triggering procedural event...');
      gameController.triggerProceduralEvent();
      
      const state = gameController.getState();
      console.log('Current mode:', state.mode);
      console.log('Current event:', state.currentEventId);
      
      // Try triggering specific mandatory events
      console.log('\nTesting mandatory events:');
      ['pit_fall_event', 'overflow_ward_event', 'riot_recording_event', 'confessional_chair_event']
        .forEach(eventId => {
          try {
            gameController.startEvent(eventId);
            console.log(`✓ ${eventId} loaded`);
          } catch (error) {
            console.error(`✗ ${eventId} failed:`, error);
          }
        });
    }
  }, 100);
  
  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkLoaded);
    if (!gameController.isEventsLoaded()) {
      console.error('Event loading timed out');
    }
  }, 5000);
}

/**
 * Example Usage in Main Game Loop
 */
export function setupEventSystem(): {
  eventCooldown: EventCooldown;
  eventQueue: EventQueue;
  currentStep: number;
} {
  return {
    eventCooldown: new EventCooldown(10),
    eventQueue: new EventQueue(),
    currentStep: 0,
  };
}

// Example main loop integration
export function gameLoopTick(
  gameController: GameController,
  context: ReturnType<typeof setupEventSystem>,
  currentTileType: string
): void {
  context.currentStep++;
  
  // Process queued events first
  if (context.eventQueue.hasEvents()) {
    context.eventQueue.processNext(gameController);
    return;
  }
  
  // Handle exploration events
  explorationStep(
    gameController,
    context.eventCooldown,
    context.currentStep,
    currentTileType
  );
}
