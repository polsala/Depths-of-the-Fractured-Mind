import type { GameMode, GameState } from "../state";
import { resolvePartyDefeat } from "../defeat";

export interface GameEventChoice {
  id: string;
  label: string;
  description?: string;
  requires?: (state: GameState) => boolean;
  unavailableReason?: (state: GameState) => string | null;
  apply: (state: GameState) => GameState;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: GameEventChoice[];
  nextEventId?: string;
  repeatable?: boolean;
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

export function getChoiceUnavailableReason(choice: GameEventChoice, state: GameState): string | null {
  if (choice.unavailableReason) return choice.unavailableReason(state);
  return choice.requires && !choice.requires(state) ? "Requirements not met." : null;
}

export function isEventAvailable(state: GameState, eventId: string): boolean {
  const event = EVENT_REGISTRY[eventId];
  return !!event && (event.repeatable === true || !state.flags.completedEventIds?.has(eventId));
}

export function startEvent(state: GameState, eventId: string): GameState {
  if (state.mode !== "exploration" && state.mode !== "event") return state;
  if (state.flags.completedEventIds?.has(eventId) && EVENT_REGISTRY[eventId]?.repeatable !== true) return state;
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
  if (state.mode !== "event" || !eventId || !isEventAvailable(state, eventId)) {
    return state;
  }

  const event = EVENT_REGISTRY[eventId];
  if (!event) {
    return state;
  }

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice || getChoiceUnavailableReason(choice, state)) {
    return state;
  }

  let nextState = choice.apply(state);

  // Mark the event before following a chain; a stale button or repeated trigger
  // must never grant its rewards a second time.
  nextState = {
    ...nextState,
    flags: {
      ...nextState.flags,
      completedEventIds: new Set([...(nextState.flags.completedEventIds ?? []), eventId]),
    },
  };
  nextState = resolvePartyDefeat(nextState, "event");
  if (nextState.mode === "gameover") return nextState;

  const nextId = nextState.currentEventId && nextState.currentEventId !== eventId
    ? nextState.currentEventId
    : event.nextEventId;
  if (nextId && isEventAvailable(nextState, nextId)) {
    return { ...nextState, currentEventId: nextId, mode: "event" satisfies GameMode };
  }

  return { ...nextState, mode: "exploration", currentEventId: undefined };
}
