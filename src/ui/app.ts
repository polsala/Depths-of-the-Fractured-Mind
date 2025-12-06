import type { GameState } from "../game/state";
import type { GameEvent } from "../game/events/engine";
import { getEventById } from "../game/events/engine";
import { GameController } from "../game/index";

function renderTitle(
  root: HTMLElement,
  controller: GameController,
  _state: GameState,
  rerender: () => void
): void {
  const title = document.createElement("h1");
  title.textContent = "Depths of the Fractured Mind";
  root.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.textContent = "A psychological, turn-based descent.";
  root.appendChild(subtitle);

  const button = document.createElement("button");
  button.textContent = "New Game";
  button.addEventListener("click", () => {
    controller.newGame();
    const nextState = controller.getState();
    if (nextState.mode === "title") {
      // Auto-enter exploration after creating a new game.
      nextState.mode = "exploration";
    }
    rerender();
  });
  root.appendChild(button);
}

function renderExploration(
  root: HTMLElement,
  _controller: GameController,
  state: GameState
): void {
  const header = document.createElement("h2");
  header.textContent = "Exploration";
  root.appendChild(header);

  const location = document.createElement("p");
  location.textContent = `Depth ${state.location.depth} — Position (${state.location.x}, ${state.location.y})`;
  root.appendChild(location);

  const instructions = document.createElement("p");
  instructions.textContent = "Use arrow keys or WASD to move.";
  root.appendChild(instructions);

  const eventHint = document.createElement("p");
  eventHint.textContent = "Step onto marked tiles to trigger events.";
  root.appendChild(eventHint);
}

function renderEvent(
  root: HTMLElement,
  controller: GameController,
  state: GameState,
  rerender: () => void
): void {
  if (!state.currentEventId) {
    const message = document.createElement("p");
    message.textContent = "No event is active.";
    root.appendChild(message);

    const back = document.createElement("button");
    back.textContent = "Return to exploration";
    back.addEventListener("click", () => {
      const s = controller.getState();
      s.mode = "exploration";
      s.currentEventId = undefined;
      rerender();
    });
    root.appendChild(back);
    return;
  }

  const event: GameEvent | undefined = getEventById(state.currentEventId);
  if (!event) {
    const missing = document.createElement("p");
    missing.textContent = `Event not found: ${state.currentEventId}`;
    root.appendChild(missing);
    const back = document.createElement("button");
    back.textContent = "Return to exploration";
    back.addEventListener("click", () => {
      const s = controller.getState();
      s.mode = "exploration";
      s.currentEventId = undefined;
      rerender();
    });
    root.appendChild(back);
    return;
  }

  const title = document.createElement("h2");
  title.textContent = event.title;
  root.appendChild(title);

  const desc = document.createElement("p");
  desc.textContent = event.description;
  root.appendChild(desc);

  const list = document.createElement("div");
  event.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.textContent = `${index + 1}) ${choice.label}`;
    button.addEventListener("click", () => {
      controller.chooseEventChoice(choice.id);
      rerender();
    });
    list.appendChild(button);
  });
  root.appendChild(list);
}

export function initApp(root: HTMLElement): void {
  const controller = new GameController();

  const render = (): void => {
    root.innerHTML = "";
    const state = controller.getState();

    switch (state.mode) {
      case "title":
        renderTitle(root, controller, state, render);
        break;
      case "exploration":
        renderExploration(root, controller, state);
        break;
      case "event":
        renderEvent(root, controller, state, render);
        break;
      case "combat":
      case "conversation":
      case "ending":
      case "pause": {
        const placeholder = document.createElement("p");
        placeholder.textContent = `Mode "${state.mode}" not yet implemented.`;
        root.appendChild(placeholder);
        break;
      }
      default: {
        const unknown = document.createElement("p");
        unknown.textContent = "Unknown state.";
        root.appendChild(unknown);
        break;
      }
    }
  };

  window.addEventListener("keydown", (event) => {
    const state = controller.getState();
    if (state.mode === "exploration") {
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        controller.moveNorth();
        render();
      } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        controller.moveSouth();
        render();
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        controller.moveWest();
        render();
      } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        controller.moveEast();
        render();
      }
    } else if (state.mode === "event" && state.currentEventId) {
      const eventData = getEventById(state.currentEventId);
      if (!eventData) return;
      const index = parseInt(event.key, 10);
      if (!Number.isNaN(index) && index >= 1 && index <= eventData.choices.length) {
        const choice = eventData.choices[index - 1];
        controller.chooseEventChoice(choice.id);
        render();
      }
    }
  });

  render();
}
