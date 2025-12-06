import type { GameState } from "../game/state";
import type { GameEvent } from "../game/events/engine";
import { getEventById } from "../game/events/engine";
import { GameController } from "../game/index";
import { audioManager } from "./audio";
import {
  createRenderContext,
  renderDungeonView,
  type RenderContext,
  type ViewState,
} from "../graphics/renderer";
import { renderPartyUI } from "../graphics/party-ui";

let titleMusicStarted = false;
let dungeonRenderContext: RenderContext | null = null;

function renderTitle(
  root: HTMLElement,
  controller: GameController,
  _state: GameState,
  rerender: () => void
): void {
  if (!titleMusicStarted) {
    audioManager.playMusic("main_theme");
    titleMusicStarted = true;
  }

  // Create title screen container
  const titleContainer = document.createElement("div");
  titleContainer.className = "title-screen";
  root.appendChild(titleContainer);

  // Create decorative header with atmospheric background
  const header = document.createElement("div");
  header.className = "title-header";
  titleContainer.appendChild(header);

  const title = document.createElement("h1");
  title.className = "title-main";
  title.textContent = "Depths of the Fractured Mind";
  header.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.className = "title-subtitle";
  subtitle.textContent = "A psychological, turn-based descent into madness";
  header.appendChild(subtitle);

  // Menu container
  const menu = document.createElement("div");
  menu.className = "title-menu";
  titleContainer.appendChild(menu);

  const button = document.createElement("button");
  button.className = "title-button";
  button.textContent = "Begin Your Descent";
  button.addEventListener("click", () => {
    audioManager.playSfx("ui_click");
    controller.newGame();
    const nextState = controller.getState();
    if (nextState.mode === "title") {
      // Auto-enter exploration after creating a new game.
      nextState.mode = "exploration";
    }
    audioManager.playMusic("depth1_ambient");
    rerender();
  });
  menu.appendChild(button);

  // Atmospheric flavor text
  const flavorText = document.createElement("div");
  flavorText.className = "title-flavor";
  flavorText.innerHTML = `
    <p>Four souls descend into the abandoned facility...</p>
    <p>Seeking truth, redemption, or merely escape.</p>
    <p>But the depths hold more than darkness.</p>
    <p>They hold guilt made manifest.</p>
  `;
  titleContainer.appendChild(flavorText);
}

function renderExploration(
  root: HTMLElement,
  _controller: GameController,
  state: GameState
): void {
  // Create main container with flex layout
  const container = document.createElement("div");
  container.className = "exploration-container";
  root.appendChild(container);

  // Create viewport container
  const viewportContainer = document.createElement("div");
  viewportContainer.className = "viewport-container";
  container.appendChild(viewportContainer);

  // Create and add dungeon viewport canvas
  const viewportCanvas = document.createElement("canvas");
  viewportCanvas.className = "dungeon-viewport";
  viewportContainer.appendChild(viewportCanvas);

  // Initialize renderer if not already done
  if (!dungeonRenderContext) {
    dungeonRenderContext = createRenderContext(viewportCanvas, {
      width: 640,
      height: 480,
      fov: 60,
    });
  }

  // Render the dungeon view
  const viewState: ViewState = {
    x: state.location.x,
    y: state.location.y,
    depth: state.location.depth,
    direction: "north", // Default direction for now
  };
  renderDungeonView(dungeonRenderContext, viewState);

  // Create info panel
  const infoPanel = document.createElement("div");
  infoPanel.className = "info-panel";
  container.appendChild(infoPanel);

  // Location info
  const locationInfo = document.createElement("div");
  locationInfo.className = "location-info";
  locationInfo.innerHTML = `
    <h3>Depth ${state.location.depth}</h3>
    <p>Position: (${state.location.x}, ${state.location.y})</p>
  `;
  infoPanel.appendChild(locationInfo);

  // Create party UI canvas
  const partyCanvas = document.createElement("canvas");
  partyCanvas.className = "party-panel";
  infoPanel.appendChild(partyCanvas);

  // Render party UI
  renderPartyUI(partyCanvas, state.party, {
    width: 320,
    height: 320,
    portraitSize: 64,
  });

  // Instructions
  const instructions = document.createElement("div");
  instructions.className = "instructions";
  instructions.innerHTML = `
    <p><strong>Controls:</strong></p>
    <p>Arrow Keys / WASD - Move</p>
    <p>Step onto marked tiles to trigger events</p>
  `;
  infoPanel.appendChild(instructions);
}

function renderEvent(
  root: HTMLElement,
  controller: GameController,
  state: GameState,
  rerender: () => void
): void {
  if (!state.currentEventId) {
    const container = document.createElement("div");
    container.className = "event-container";
    root.appendChild(container);

    const message = document.createElement("p");
    message.textContent = "No event is active.";
    container.appendChild(message);

    const back = document.createElement("button");
    back.textContent = "Return to Exploration";
    back.addEventListener("click", () => {
      const s = controller.getState();
      s.mode = "exploration";
      s.currentEventId = undefined;
      rerender();
    });
    container.appendChild(back);
    return;
  }

  const event: GameEvent | undefined = getEventById(state.currentEventId);
  if (!event) {
    const container = document.createElement("div");
    container.className = "event-container";
    root.appendChild(container);

    const missing = document.createElement("p");
    missing.textContent = `Event not found: ${state.currentEventId}`;
    container.appendChild(missing);

    const back = document.createElement("button");
    back.textContent = "Return to Exploration";
    back.addEventListener("click", () => {
      const s = controller.getState();
      s.mode = "exploration";
      s.currentEventId = undefined;
      rerender();
    });
    container.appendChild(back);
    return;
  }

  // Create event container
  const container = document.createElement("div");
  container.className = "event-container";
  root.appendChild(container);

  // Event header
  const header = document.createElement("div");
  header.className = "event-header";
  container.appendChild(header);

  const title = document.createElement("h2");
  title.className = "event-title";
  title.textContent = event.title;
  header.appendChild(title);

  // Event description
  const descBox = document.createElement("div");
  descBox.className = "event-description";
  container.appendChild(descBox);

  const desc = document.createElement("p");
  desc.textContent = event.description;
  descBox.appendChild(desc);

  // Choices
  const choicesContainer = document.createElement("div");
  choicesContainer.className = "event-choices";
  container.appendChild(choicesContainer);

  event.choices.forEach((choice, index) => {
    const choiceButton = document.createElement("button");
    choiceButton.className = "event-choice-button";
    choiceButton.innerHTML = `
      <span class="choice-number">${index + 1}</span>
      <span class="choice-text">${choice.label}</span>
    `;
    choiceButton.addEventListener("click", () => {
      audioManager.playSfx("event_choice");
      controller.chooseEventChoice(choice.id);
      rerender();
    });
    choicesContainer.appendChild(choiceButton);
  });
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
