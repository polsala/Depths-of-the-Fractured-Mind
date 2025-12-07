import type { GameLocation, GameState } from "./state";
import { createInitialGameState } from "./state";
import { createDefaultParty } from "./characters/party";
import { moveEast, moveNorth, moveSouth, moveWest, moveForward, moveBackward, strafeLeft, strafeRight } from "./exploration/movement";
import { applyEventChoice, startEvent } from "./events/engine";
import { registerMandatoryEvents } from "./events/mandatory";
import { loadEventDataFile } from "./events/loader";
import { selectEventForLocation } from "./events/procedural";
import { generateRandomEncounter, generateBossEncounter } from "./combat/encounters";
import { createCombatState, type CombatAction, getCurrentActor } from "./combat/state";
import { submitAction } from "./combat/turn-manager";

const PROCEDURAL_EVENT_CHANCE = 0.12;
const MIN_STEPS_BETWEEN_EVENTS = 2;

export class GameController {
  private state: GameState;
  private eventsReady: boolean = false;
  private eventLoadingError: Error | null = null;
  private stepsSinceLastEvent: number = 0;

  constructor() {
    registerMandatoryEvents();
    this.state = createInitialGameState();
    this.state = {
      ...this.state,
      party: createDefaultParty(),
    };
    
    // Load event data asynchronously
    this.loadEvents();
  }
  
  private async loadEvents(): Promise<void> {
    try {
      // Use correct base path for both dev and production
      const basePath = import.meta.env.BASE_URL || '/';
      await loadEventDataFile(`${basePath}data/events.json`);
      this.eventsReady = true;
      console.log("Event data loaded successfully");
    } catch (error) {
      console.error("Failed to load event data:", error);
      this.eventLoadingError = error instanceof Error ? error : new Error(String(error));
      // Events registered via registerMandatoryEvents() will still work as fallback
      this.eventsReady = true; // Mark as ready to allow game to proceed with fallback events
    }
  }
  
  public isEventsLoaded(): boolean {
    return this.eventsReady;
  }
  
  public hasEventLoadingError(): boolean {
    return this.eventLoadingError !== null;
  }

  public getState(): GameState {
    return this.state;
  }

  public newGame(): void {
    this.state = {
      ...createInitialGameState(),
      party: createDefaultParty(),
    };
    this.stepsSinceLastEvent = 0;
  }

  public moveNorth(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveNorth(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveSouth(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveSouth(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveEast(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveEast(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveWest(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveWest(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveForward(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveForward(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveBackward(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveBackward(this.state);
    this.handlePostMove(previousLocation);
  }

  public strafeLeft(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = strafeLeft(this.state);
    this.handlePostMove(previousLocation);
  }

  public strafeRight(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = strafeRight(this.state);
    this.handlePostMove(previousLocation);
  }

  public startEvent(eventId: string): void {
    this.state = startEvent(this.state, eventId);
  }

  public chooseEventChoice(choiceId: string): void {
    if (this.state.mode !== "event" || !this.state.currentEventId) {
      return;
    }
    this.state = applyEventChoice(this.state, choiceId);
  }
  
  /**
   * Trigger a procedurally selected event for the current location
   */
  public triggerProceduralEvent(): boolean {
    if (!this.eventsReady || this.state.mode !== "exploration") {
      return false;
    }

    const eventId = selectEventForLocation(this.state);
    if (eventId) {
      const nextState = startEvent(this.state, eventId);
      const triggered = nextState !== this.state && nextState.mode === "event";
      this.state = nextState;
      if (triggered) {
        this.stepsSinceLastEvent = 0;
      }
      return triggered;
    }
    return false;
  }

  /**
   * Start a random combat encounter
   */
  public startCombat(isBoss: boolean = false): void {
    const encounter = isBoss
      ? generateBossEncounter(this.state.location.depth)
      : generateRandomEncounter(this.state.location.depth);
    
    if (!encounter) {
      console.error("Failed to generate encounter");
      return;
    }
    
    this.state.combatState = createCombatState(this.state.party, encounter, isBoss);
    this.state.currentEncounterId = `encounter_${Date.now()}`;
    this.state.mode = "combat";
  }

  /**
   * Submit a combat action for the current character
   */
  public submitCombatAction(action: CombatAction): void {
    if (!this.state.combatState || this.state.mode !== "combat") return;
    
    // Only allow action submission if we're in select-action phase
    if (this.state.combatState.phase !== "select-action") return;
    
    // Submit and execute the action
    submitAction(this.state.combatState, action);
  }

  /**
   * After moving in exploration, decide if we should surface a procedural event
   */
  private handlePostMove(previousLocation: GameLocation): void {
    if (!this.eventsReady || this.state.mode !== "exploration") {
      return;
    }

    const currentLocation = this.state.location;
    const moved =
      previousLocation.x !== currentLocation.x ||
      previousLocation.y !== currentLocation.y ||
      previousLocation.depth !== currentLocation.depth;

    if (!moved) {
      return;
    }

    this.stepsSinceLastEvent += 1;
    if (this.stepsSinceLastEvent < MIN_STEPS_BETWEEN_EVENTS) {
      return;
    }

    if (Math.random() < PROCEDURAL_EVENT_CHANCE) {
      const previousMode = this.state.mode;
      this.triggerProceduralEvent();
      if (this.state.mode !== previousMode) {
        this.stepsSinceLastEvent = 0;
      }
    }
  }
  
  /**
   * Get the current actor in combat (for UI to know whose turn it is)
   */
  public getCurrentCombatActor(): { isPlayer: boolean; index: number } | null {
    if (!this.state.combatState) return null;
    return getCurrentActor(this.state.combatState);
  }

  /**
   * End combat and return to exploration
   */
  public endCombat(): void {
    if (!this.state.combatState) return;
    
    // Sync party state back from combat
    this.state.party = this.state.combatState.party;
    this.state.combatState = undefined;
    this.state.mode = "exploration";
  }

  /**
   * Get current combat state
   */
  public getCombatState(): any {
    return this.state.combatState;
  }
}
