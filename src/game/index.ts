import type { GameState } from "./state";
import { createInitialGameState } from "./state";
import { createDefaultParty } from "./characters/party";
import { moveEast, moveNorth, moveSouth, moveWest } from "./exploration/movement";
import { applyEventChoice, startEvent } from "./events/engine";
import { registerMandatoryEvents } from "./events/mandatory";

export class GameController {
  private state: GameState;

  constructor() {
    registerMandatoryEvents();
    this.state = createInitialGameState();
    this.state = {
      ...this.state,
      party: createDefaultParty(),
    };
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

  public startEvent(eventId: string): void {
    this.state = startEvent(this.state, eventId);
  }

  public chooseEventChoice(choiceId: string): void {
    if (this.state.mode !== "event" || !this.state.currentEventId) {
      return;
    }
    this.state = applyEventChoice(this.state, choiceId);
  }
}
