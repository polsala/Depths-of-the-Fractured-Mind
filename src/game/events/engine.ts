import type { GameMode, GameState } from "../state";

export interface GameEventChoice {
  id: string;
  label: string;
  description?: string;
  requires?: (state: GameState) => boolean;
  apply: (state: GameState) => GameState;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: GameEventChoice[];
  nextEventId?: string;
}

const EVENT_REGISTRY: Record<string, GameEvent> = {};

export function registerEvent(event: GameEvent): void {
  EVENT_REGISTRY[event.id] = event;
}

export function getEventById(id: string): GameEvent | undefined {
  return EVENT_REGISTRY[id];
}

export function listRegisteredEventIds(): string[] {
  return Object.keys(EVENT_REGISTRY);
}

export function startEvent(state: GameState, eventId: string): GameState {
  if (!EVENT_REGISTRY[eventId]) {
    console.error(`Event not found in registry: ${eventId}`);
    console.log(`Available events: ${Object.keys(EVENT_REGISTRY).join(", ")}`);
    // Don't change mode if event doesn't exist
    return state;
  }

  return {
    ...state,
    currentEventId: eventId,
    mode: "event" satisfies GameMode,
  };
}

export function applyEventChoice(
  state: GameState,
  choiceId: string
): GameState {
  const eventId = state.currentEventId;
  if (!eventId) {
    return state;
  }

  const event = EVENT_REGISTRY[eventId];
  if (!event) {
    return state;
  }

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return state;
  }

  let nextState = choice.apply(state);

  if (!nextState.currentEventId && event.nextEventId) {
    nextState = {
      ...nextState,
      currentEventId: event.nextEventId,
      mode: "event" satisfies GameMode,
    };
  } else if (!nextState.currentEventId) {
    nextState = {
      ...nextState,
      mode: "exploration",
      currentEventId: undefined,
    };
  }

  return nextState;
}
