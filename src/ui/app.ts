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
import { renderMinimap } from "../graphics/minimap";
import {
  rotateClockwise,
  rotateCounterClockwise,
  getDirectionArrow,
  getDirectionName,
} from "../graphics/direction";
import {
  renderCombatUI,
  renderCombatLog,
  createActionMenu,
  createAbilityMenu,
  createTargetSelector,
} from "../graphics/combat-ui";
import type { CombatState, CombatAction } from "../game/combat/state";
import { getCurrentActor } from "../game/combat/state";

let titleMusicStarted = false;
let dungeonRenderContext: RenderContext | null = null;
let currentDepthMusic: number = -1; // Track current depth for music changes
let combatMenuState: "main" | "abilities" | "target-enemy" | "target-ally" = "main";
let selectedAbilityId: string | undefined;

// Depth-to-music track mapping
const DEPTH_MUSIC_MAP: Record<number, string> = {
  1: "depth1_ambient",
  2: "depth2_archive",
  3: "depth3_ward",
  4: "depth4_mirrors",
  5: "core_heart",
};

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

  // Show loading state if events aren't ready
  if (!controller.isEventsLoaded()) {
    const loading = document.createElement("p");
    loading.textContent = "Loading events...";
    loading.style.fontStyle = "italic";
    root.appendChild(loading);
    
    // Rerender when events are loaded (check every 250ms, reasonable interval for loading)
    setTimeout(() => rerender(), 250);
    return;
  }

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
  controller: GameController,
  state: GameState,
  rerender: () => void
): void {
  // Ensure direction is initialized
  if (!state.location.direction) {
    state.location.direction = "north";
  }

  // Play depth-appropriate music
  if (currentDepthMusic !== state.location.depth) {
    currentDepthMusic = state.location.depth;
    const musicTrack = DEPTH_MUSIC_MAP[state.location.depth];
    if (musicTrack) {
      audioManager.playMusic(musicTrack);
    }
  }

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

  // Always create a new renderer context for the new canvas
  dungeonRenderContext = createRenderContext(viewportCanvas, {
    width: 640,
    height: 480,
    fov: 60,
  }, state.depthMaps); // Pass the game state's depth maps cache

  // Render the dungeon view
  const viewState: ViewState = {
    x: state.location.x,
    y: state.location.y,
    depth: state.location.depth,
    direction: state.location.direction,
  };
  renderDungeonView(dungeonRenderContext, viewState);

  // Create info panel
  const infoPanel = document.createElement("div");
  infoPanel.className = "info-panel";
  container.appendChild(infoPanel);

  // Location info with direction
  const locationInfo = document.createElement("div");
  locationInfo.className = "location-info";
  locationInfo.innerHTML = `
    <h3>Depth ${state.location.depth}</h3>
    <p>Position: (${state.location.x}, ${state.location.y})</p>
    <p class="direction-indicator">
      Facing: ${getDirectionArrow(state.location.direction)} ${getDirectionName(state.location.direction)}
    </p>
  `;
  infoPanel.appendChild(locationInfo);

  // Create and render minimap
  if (dungeonRenderContext && dungeonRenderContext.depthMaps) {
    const map = dungeonRenderContext.depthMaps.get(state.location.depth);
    if (map) {
      const minimapCanvas = document.createElement("canvas");
      minimapCanvas.className = "minimap-panel";
      infoPanel.appendChild(minimapCanvas);

      renderMinimap(
        minimapCanvas,
        map,
        state.location.x,
        state.location.y,
        state.location.direction,
        {
          width: 160,
          height: 160,
          tileSize: 14,
        }
      );
    }
  }

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
    <p>W/↑ - Move Forward</p>
    <p>S/↓ - Move Backward</p>
    <p>A/← - Strafe Left</p>
    <p>D/→ - Strafe Right</p>
    <p>Q - Turn Left, E - Turn Right</p>
    <p>Step onto marked tiles to trigger events</p>
  `;
  infoPanel.appendChild(instructions);

  // Debug: Combat test button
  const debugSection = document.createElement("div");
  debugSection.className = "debug-controls";
  debugSection.style.marginTop = "10px";
  debugSection.style.padding = "10px";
  debugSection.style.border = "1px dashed #666";
  
  const combatTestBtn = document.createElement("button");
  combatTestBtn.textContent = "Test Combat";
  combatTestBtn.style.marginRight = "5px";
  combatTestBtn.addEventListener("click", () => {
    controller.startCombat(false);
    rerender();
  });
  debugSection.appendChild(combatTestBtn);
  
  const bossCombatBtn = document.createElement("button");
  bossCombatBtn.textContent = "Test Boss";
  bossCombatBtn.addEventListener("click", () => {
    controller.startCombat(true);
    rerender();
  });
  debugSection.appendChild(bossCombatBtn);
  
  infoPanel.appendChild(debugSection);

  // Audio controls
  const audioControls = document.createElement("div");
  audioControls.className = "audio-controls";
  audioControls.innerHTML = `
    <p><strong>Audio:</strong></p>
    <label>Music: <input type="range" id="music-volume" min="0" max="100" value="70" /></label>
    <label>SFX: <input type="range" id="sfx-volume" min="0" max="100" value="80" /></label>
  `;
  infoPanel.appendChild(audioControls);

  // Add event listeners for volume controls
  const musicVolumeControl = audioControls.querySelector("#music-volume") as HTMLInputElement;
  const sfxVolumeControl = audioControls.querySelector("#sfx-volume") as HTMLInputElement;

  if (musicVolumeControl) {
    musicVolumeControl.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      audioManager.setMusicVolume(parseInt(target.value, 10) / 100);
    });
  }

  if (sfxVolumeControl) {
    sfxVolumeControl.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      audioManager.setSfxVolume(parseInt(target.value, 10) / 100);
    });
  }
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
    
    const errorTitle = document.createElement("h3");
    errorTitle.textContent = "Event Error";
    missing.appendChild(errorTitle);
    
    const errorMsg = document.createElement("p");
    errorMsg.textContent = `Event not found: ${state.currentEventId}`;
    missing.appendChild(errorMsg);
    
    const hint = document.createElement("p");
    hint.textContent = "This may indicate that events are still loading or the event data is missing.";
    hint.style.fontStyle = "italic";
    missing.appendChild(hint);
    
    root.appendChild(missing);
    
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

function renderCombat(
  root: HTMLElement,
  controller: GameController,
  state: GameState,
  rerender: () => void
): void {
  const combatState = controller.getCombatState() as CombatState;
  if (!combatState) {
    // Combat state not properly initialized - fall back to exploration
    console.error("Combat state not found. Returning to exploration mode.");
    state.mode = "exploration";
    state.combatState = undefined;
    state.currentEncounterId = undefined;
    rerender();
    return;
  }

  // Play combat music
  const music = combatState.isBossFight ? "battle_boss" : "battle_normal";
  audioManager.playMusic(music);

  // Create combat container
  const combatContainer = document.createElement("div");
  combatContainer.className = "combat-container";
  combatContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1a1a1a;
  `;
  root.appendChild(combatContainer);

  // Top section: Combat view
  const combatView = document.createElement("div");
  combatView.style.cssText = `
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  `;
  combatContainer.appendChild(combatView);

  // Combat canvas
  const combatCanvas = document.createElement("canvas");
  combatView.appendChild(combatCanvas);
  renderCombatUI(combatCanvas, combatState, { width: 800, height: 400 });

  // Bottom section: Controls and log
  const controlsSection = document.createElement("div");
  controlsSection.style.cssText = `
    display: flex;
    height: 300px;
    gap: 20px;
    padding: 20px;
  `;
  combatContainer.appendChild(controlsSection);

  // Combat log
  const logContainer = document.createElement("div");
  logContainer.style.flex = "1";
  controlsSection.appendChild(logContainer);
  renderCombatLog(logContainer, combatState, 15);

  // Action menu
  const actionContainer = document.createElement("div");
  actionContainer.style.flex = "1";
  controlsSection.appendChild(actionContainer);

  const handleAction = (action: any) => {
    if (action.type === "end-combat") {
      controller.endCombat();
      // Return to exploration music
      const depthMusicMap = ["ambient", "archive", "ward", "mirrors", "heart"];
      const musicSuffix = depthMusicMap[state.location.depth - 1] || "ambient";
      const depthMusic = `depth${state.location.depth}_${musicSuffix}`;
      audioManager.playMusic(depthMusic);
      rerender();
      return;
    }

    if (action.type === "retry") {
      // Reload page or restart
      window.location.reload();
      return;
    }

    if (action.type === "show-abilities") {
      combatMenuState = "abilities";
      renderActionMenu();
      return;
    }

    if (action.type === "show-items") {
      // TODO: Implement item menu
      return;
    }

    if (action.type === "select-target") {
      if (action.actionType === "attack") {
        combatMenuState = "target-enemy";
        renderActionMenu();
      }
      return;
    }

    if (action.type === "defend") {
      const combatAction: CombatAction = {
        type: "defend",
        actorIndex: action.actorIndex,
        isPlayerAction: true,
      };
      controller.submitCombatAction(combatAction);
      combatMenuState = "main";
      rerender();
      return;
    }

    if (action.type === "flee") {
      const combatAction: CombatAction = {
        type: "flee",
        actorIndex: action.actorIndex,
        isPlayerAction: true,
      };
      controller.submitCombatAction(combatAction);
      combatMenuState = "main";
      rerender();
      return;
    }
  };

  const handleAbility = (abilityId: string) => {
    selectedAbilityId = abilityId;
    combatMenuState = "target-enemy"; // Most abilities target enemies
    renderActionMenu();
  };

  const handleTarget = (targetIndex: number) => {
    const currentActor = getCurrentActor(combatState);
    if (!currentActor || !currentActor.isPlayer) return;
    
    if (selectedAbilityId) {
      const combatAction: CombatAction = {
        type: "ability",
        actorIndex: currentActor.index,
        targetIndex,
        abilityId: selectedAbilityId,
        isPlayerAction: true,
      };
      controller.submitCombatAction(combatAction);
      selectedAbilityId = undefined;
    } else {
      const combatAction: CombatAction = {
        type: "attack",
        actorIndex: currentActor.index,
        targetIndex,
        isPlayerAction: true,
      };
      controller.submitCombatAction(combatAction);
    }
    combatMenuState = "main";
    rerender();
  };

  const handleBack = () => {
    combatMenuState = "main";
    selectedAbilityId = undefined;
    renderActionMenu();
  };

  const renderActionMenu = () => {
    actionContainer.innerHTML = "";
    
    if (combatMenuState === "main") {
      createActionMenu(actionContainer, combatState, handleAction);
    } else if (combatMenuState === "abilities") {
      createAbilityMenu(actionContainer, combatState, handleAbility, handleBack);
    } else if (combatMenuState === "target-enemy") {
      createTargetSelector(actionContainer, combatState, false, handleTarget, handleBack);
    } else if (combatMenuState === "target-ally") {
      createTargetSelector(actionContainer, combatState, true, handleTarget, handleBack);
    }
  };

  renderActionMenu();
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
        renderExploration(root, controller, state, render);
        break;
      case "event":
        renderEvent(root, controller, state, render);
        break;
      case "combat":
        renderCombat(root, controller, state, render);
        break;
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

  // Helper to check if player location or mode changed
  const hasLocationChanged = (prevState: GameState, newState: GameState): boolean => {
    return prevState.location.x !== newState.location.x || 
           prevState.location.y !== newState.location.y || 
           prevState.location.depth !== newState.location.depth ||
           prevState.location.direction !== newState.location.direction ||
           prevState.mode !== newState.mode;
  };

  window.addEventListener("keydown", (event) => {
    const state = controller.getState();
    if (state.mode === "exploration") {
      // Ensure direction is initialized
      if (!state.location.direction) {
        state.location.direction = "north";
      }

      // Rotation controls
      if (event.key.toLowerCase() === "q") {
        state.location.direction = rotateCounterClockwise(state.location.direction);
        render();
      } else if (event.key.toLowerCase() === "e") {
        state.location.direction = rotateClockwise(state.location.direction);
        render();
      }
      // Movement controls - direction-relative
      else if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        const prevState = controller.getState();
        controller.moveForward();
        const newState = controller.getState();
        if (hasLocationChanged(prevState, newState)) {
          render();
        }
      } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        const prevState = controller.getState();
        controller.moveBackward();
        const newState = controller.getState();
        if (hasLocationChanged(prevState, newState)) {
          render();
        }
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        const prevState = controller.getState();
        controller.strafeLeft();
        const newState = controller.getState();
        if (hasLocationChanged(prevState, newState)) {
          render();
        }
      } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        const prevState = controller.getState();
        controller.strafeRight();
        const newState = controller.getState();
        if (hasLocationChanged(prevState, newState)) {
          render();
        }
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
