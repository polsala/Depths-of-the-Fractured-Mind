import type { GameState } from "./state";
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

export class GameController {
  private state: GameState;
  private eventsReady: boolean = false;
  private eventLoadingError: Error | null = null;

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
  }

  public moveNorth(): void {
    if (this.state.mode !== "exploration") return;
    this.state = moveNorth(this.state);
  }

  public moveSouth(): void {
    if (this.state.mode !== "exploration") return;
    this.state = moveSouth(this.state);
  }

  public moveEast(): void {
    if (this.state.mode !== "exploration") return;
    this.state = moveEast(this.state);
  }

  public moveWest(): void {
    if (this.state.mode !== "exploration") return;
    this.state = moveWest(this.state);
  }

  public moveForward(): void {
    if (this.state.mode !== "exploration") return;
    this.state = moveForward(this.state);
  }

  public moveBackward(): void {
    if (this.state.mode !== "exploration") return;
    this.state = moveBackward(this.state);
  }

  public strafeLeft(): void {
    if (this.state.mode !== "exploration") return;
    this.state = strafeLeft(this.state);
  }

  public strafeRight(): void {
    if (this.state.mode !== "exploration") return;
    this.state = strafeRight(this.state);
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
  public triggerProceduralEvent(): void {
    if (this.state.mode !== "exploration") {
      return;
    }
    
    const eventId = selectEventForLocation(this.state);
    if (eventId) {
      this.state = startEvent(this.state, eventId);
    }
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
