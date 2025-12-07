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
import { renderMinimap, type MinimapConfig } from "../graphics/minimap";
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
} from "../graphics/combat-ui";
import type { CombatState, CombatAction } from "../game/combat/state";
import { getCurrentActor } from "../game/combat/state";
import { getCharacterAbilities, canUseAbility } from "../game/abilities";
import { ITEMS } from "../game/inventory";
import { detectPlatform, getResponsiveViewportSize, getResponsiveUISize } from "../utils/platform";
import { createMobileControls, type MobileControls } from "./mobile-controls";
import type { DungeonMap } from "../graphics/map";

const combatBackgroundCache: Record<string, HTMLImageElement> = {};

let titleMusicStarted = false;
let dungeonRenderContext: RenderContext | null = null;
let currentDepthMusic: number = -1; // Track current depth for music changes
let selectedAbilityId: string | undefined;
let mobileControls: MobileControls | null = null;
let minimapModal: HTMLDivElement | null = null;
let minimapModalCanvas: HTMLCanvasElement | null = null;
let minimapModalConfig: MinimapConfig | null = null;
let combatActionModal: HTMLDivElement | null = null;

// Depth-to-music track mapping
const DEPTH_MUSIC_MAP: Record<number, string> = {
  1: "depth1_ambient",
  2: "depth2_archive",
  3: "depth3_ward",
  4: "depth4_mirrors",
  5: "core_heart",
};

// Helper to check if player location or mode changed
function hasLocationChanged(prevState: GameState, newState: GameState): boolean {
  return prevState.location.x !== newState.location.x || 
         prevState.location.y !== newState.location.y || 
         prevState.location.depth !== newState.location.depth ||
         prevState.location.direction !== newState.location.direction ||
         prevState.mode !== newState.mode;
}

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

function closeMinimapModal(): void {
  if (minimapModal) {
    minimapModal.remove();
  }
  minimapModal = null;
  minimapModalCanvas = null;
  minimapModalConfig = null;
}

function renderMinimapModal(
  map: DungeonMap,
  x: number,
  y: number,
  direction: NonNullable<GameState["location"]["direction"]>,
  platform: ReturnType<typeof detectPlatform>
): void {
  const modalWidth = Math.min(Math.max(window.innerWidth * 0.75, 320), 540);
  const modalHeight = Math.min(Math.max(window.innerHeight * 0.6, 260), 420);
  const tileSize = platform === "mobile" ? 18 : 20;

  minimapModalConfig = {
    width: Math.floor(modalWidth),
    height: Math.floor(modalHeight),
    tileSize,
  };

  if (!minimapModal) {
    minimapModal = document.createElement("div");
    minimapModal.className = "minimap-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "minimap-modal";
    minimapModal.appendChild(modal);

    const header = document.createElement("div");
    header.className = "minimap-modal-header";
    header.innerHTML = "<span>Expanded Minimap</span>";
    modal.appendChild(header);

    const closeButton = document.createElement("button");
    closeButton.className = "minimap-modal-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close minimap");
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", closeMinimapModal);
    header.appendChild(closeButton);

    minimapModalCanvas = document.createElement("canvas");
    minimapModalCanvas.className = "minimap-modal-canvas";
    modal.appendChild(minimapModalCanvas);

    minimapModal.addEventListener("click", (event) => {
      if (event.target === minimapModal) {
        closeMinimapModal();
      }
    });

    document.body.appendChild(minimapModal);
  }

  if (minimapModalCanvas && minimapModalConfig) {
    renderMinimap(minimapModalCanvas, map, x, y, direction, minimapModalConfig);
  }
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
  const facingDirection = state.location.direction ?? "north";
  state.location.direction = facingDirection;

  // Play depth-appropriate music
  if (currentDepthMusic !== state.location.depth) {
    currentDepthMusic = state.location.depth;
    const musicTrack = DEPTH_MUSIC_MAP[state.location.depth];
    if (musicTrack) {
      audioManager.playMusic(musicTrack);
    }
  }

  // Detect platform and get responsive sizes
  const platform = detectPlatform();
  const viewportSize = getResponsiveViewportSize();
  const partyUISize = getResponsiveUISize('party');
  const minimapSize = getResponsiveUISize('minimap');

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

  // Always create a new renderer context for the new canvas with responsive size
  dungeonRenderContext = createRenderContext(viewportCanvas, {
    width: viewportSize.width,
    height: viewportSize.height,
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
      Facing: ${getDirectionArrow(facingDirection)} ${getDirectionName(facingDirection)}
    </p>
  `;
  infoPanel.appendChild(locationInfo);

  // Create and render minimap
  if (dungeonRenderContext && dungeonRenderContext.depthMaps) {
    const map = dungeonRenderContext.depthMaps.get(state.location.depth);
    if (map) {
      const minimapWrapper = document.createElement("div");
      minimapWrapper.className = "minimap-wrapper";
      infoPanel.appendChild(minimapWrapper);

      const minimapCanvas = document.createElement("canvas");
      minimapCanvas.className = "minimap-panel";
      minimapWrapper.appendChild(minimapCanvas);

      const zoomButton = document.createElement("button");
      zoomButton.className = "minimap-zoom-button";
      zoomButton.type = "button";
      zoomButton.setAttribute("aria-label", "Expand minimap");
      zoomButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none" />
          <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      `;
      zoomButton.addEventListener("click", () => {
        renderMinimapModal(
          map as DungeonMap,
          state.location.x,
          state.location.y,
          facingDirection,
          platform
        );
      });
      minimapWrapper.appendChild(zoomButton);

      const tileSizeForMinimap = platform === 'mobile' ? 12 : 14;
      renderMinimap(
        minimapCanvas,
        map,
        state.location.x,
        state.location.y,
        facingDirection,
        {
          width: minimapSize.width,
          height: minimapSize.height,
          tileSize: tileSizeForMinimap,
        }
      );

      if (minimapModal) {
        renderMinimapModal(
          map as DungeonMap,
          state.location.x,
          state.location.y,
          facingDirection,
          platform
        );
      }
    }
  }

  // Create party UI canvas
  const partyCanvas = document.createElement("canvas");
  partyCanvas.className = "party-panel";
  infoPanel.appendChild(partyCanvas);

  // Render party UI with responsive size
  const portraitSizeForParty = platform === 'mobile' ? 48 : 64;
  renderPartyUI(partyCanvas, state.party, {
    width: partyUISize.width,
    height: partyUISize.height,
    portraitSize: portraitSizeForParty,
  });

  // Instructions - show appropriate controls based on platform
  const instructions = document.createElement("div");
  instructions.className = "instructions";
  if (platform === 'mobile') {
    instructions.innerHTML = `
      <p><strong>Controls:</strong></p>
      <p>Use on-screen D-pad to move</p>
      <p>Q/E buttons to turn</p>
      <p>Step onto marked tiles to trigger events</p>
    `;
  } else {
    instructions.innerHTML = `
      <p><strong>Controls:</strong></p>
      <p>W/↑ - Move Forward</p>
      <p>S/↓ - Move Backward</p>
      <p>A/← - Strafe Left</p>
      <p>D/→ - Strafe Right</p>
      <p>Q - Turn Left, E - Turn Right</p>
      <p>Step onto marked tiles to trigger events</p>
    `;
  }
  infoPanel.appendChild(instructions);

  // Create mobile controls if on mobile platform
  if (platform === 'mobile') {
    // Clean up existing mobile controls if any
    if (mobileControls) {
      mobileControls.cleanup();
    }

    // Helper to execute movement and rerender if location changed
    const executeMovement = (movementFn: () => void) => {
      const prevState = controller.getState();
      movementFn();
      const newState = controller.getState();
      if (hasLocationChanged(prevState, newState)) {
        rerender();
      }
    };

    mobileControls = createMobileControls({
      onMoveForward: () => executeMovement(() => controller.moveForward()),
      onMoveBackward: () => executeMovement(() => controller.moveBackward()),
      onStrafeLeft: () => executeMovement(() => controller.strafeLeft()),
      onStrafeRight: () => executeMovement(() => controller.strafeRight()),
      onTurnLeft: () => {
        if (!state.location.direction) {
          state.location.direction = "north";
        }
        state.location.direction = rotateCounterClockwise(state.location.direction);
        rerender();
      },
      onTurnRight: () => {
        if (!state.location.direction) {
          state.location.direction = "north";
        }
        state.location.direction = rotateClockwise(state.location.direction);
        rerender();
      },
    });

    // Append mobile controls to body (not to root, since root gets cleared)
    document.body.appendChild(mobileControls.container);
  } else {
    // Clean up mobile controls on desktop
    if (mobileControls) {
      mobileControls.cleanup();
      mobileControls = null;
    }
  }

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

  const debugToggles = document.createElement("div");
  debugToggles.style.marginTop = "8px";
  debugToggles.style.display = "grid";
  debugToggles.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
  debugToggles.style.gap = "6px";
  debugSection.appendChild(debugToggles);

  const debugOptions = controller.getDebugOptions();

  const nextFloorButton = document.createElement("button");
  nextFloorButton.textContent = "Skip to Next Floor";
  nextFloorButton.addEventListener("click", () => {
    controller.debugNextDepth();
    rerender();
  });
  debugToggles.appendChild(nextFloorButton);

  const encounterLabel = document.createElement("label");
  encounterLabel.style.display = "flex";
  encounterLabel.style.alignItems = "center";
  encounterLabel.style.gap = "6px";
  const encounterCheckbox = document.createElement("input");
  encounterCheckbox.type = "checkbox";
  encounterCheckbox.checked = !!debugOptions.disableEncounters;
  encounterCheckbox.addEventListener("change", () => {
    controller.updateDebugOptions({ disableEncounters: encounterCheckbox.checked });
  });
  encounterLabel.appendChild(encounterCheckbox);
  encounterLabel.appendChild(document.createTextNode("Disable encounters"));
  debugToggles.appendChild(encounterLabel);

  const oneHitLabel = document.createElement("label");
  oneHitLabel.style.display = "flex";
  oneHitLabel.style.alignItems = "center";
  oneHitLabel.style.gap = "6px";
  const oneHitCheckbox = document.createElement("input");
  oneHitCheckbox.type = "checkbox";
  oneHitCheckbox.checked = !!debugOptions.oneHitKill;
  oneHitCheckbox.addEventListener("change", () => {
    controller.updateDebugOptions({ oneHitKill: oneHitCheckbox.checked });
  });
  oneHitLabel.appendChild(oneHitCheckbox);
  oneHitLabel.appendChild(document.createTextNode("1-hit kill (players)"));
  debugToggles.appendChild(oneHitLabel);

  const xpWrapper = document.createElement("label");
  xpWrapper.style.display = "flex";
  xpWrapper.style.alignItems = "center";
  xpWrapper.style.gap = "6px";
  const xpInput = document.createElement("input");
  xpInput.type = "number";
  xpInput.min = "0";
  xpInput.step = "0.5";
  xpInput.value = String(debugOptions.xpMultiplier ?? 1);
  xpInput.style.width = "64px";
  xpInput.addEventListener("input", () => {
    const value = Math.max(0, parseFloat(xpInput.value) || 0);
    controller.updateDebugOptions({ xpMultiplier: value });
  });
  xpWrapper.appendChild(document.createTextNode("XP multiplier"));
  xpWrapper.appendChild(xpInput);
  debugToggles.appendChild(xpWrapper);
  
  infoPanel.appendChild(debugSection);

  // Chest loot modal
  if (state.chestLoot && state.chestLoot.items.length > 0) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: #111;
      border: 2px solid #6b4b1f;
      padding: 16px;
      max-width: 420px;
      width: 90%;
      color: #e0e0e0;
      font-family: monospace;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    `;

    const title = document.createElement("h3");
    title.textContent = "Chest opened";
    title.style.marginTop = "0";
    title.style.marginBottom = "8px";
    modal.appendChild(title);

    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0 0 12px 0";
    state.chestLoot.items.forEach((loot) => {
      const li = document.createElement("li");
      const itemName = ITEMS[loot.id]?.name || loot.id;
      li.textContent = `${loot.quantity}x ${itemName}`;
      li.style.marginBottom = "4px";
      list.appendChild(li);
    });
    modal.appendChild(list);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.cssText = `
      background: #2a2a2a;
      color: #e0e0e0;
      border: 2px solid #4a4a4a;
      padding: 8px 12px;
      font-family: monospace;
      cursor: pointer;
    `;
    closeBtn.addEventListener("click", () => {
      controller.clearChestLoot();
      overlay.remove();
      rerender();
    });

    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    root.appendChild(overlay);
  }

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
  closeCombatModal();

  // Play combat music
  const music = combatState.isBossFight ? "battle_boss" : "battle_normal";
  audioManager.playMusic(music);

  const combatBackground = combatState.isBossFight
    ? getAssetUrl("assets/backgrounds/bosses/boss_bg1.png")
    : getAssetUrl("assets/backgrounds/battle/battle_bg1.png");
  const backgroundImage = getCombatBackground(combatBackground);
  const combatLayoutWidth = Math.min(1200, Math.floor(window.innerWidth * 0.95));
  const canvasWidth = Math.min(combatLayoutWidth, Math.floor(window.innerWidth * 0.92));
  const canvasHeight = Math.max(360, Math.min(560, Math.floor(window.innerHeight * 0.45)));
  const controlsHeight = Math.min(360, Math.max(240, Math.floor(window.innerHeight * 0.35)));

  // Create combat container
  const combatContainer = document.createElement("div");
  combatContainer.className = "combat-container";
  combatContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #05050a;
    align-items: center;
    padding: 16px;
    box-sizing: border-box;
  `;
  root.appendChild(combatContainer);

  // Top section: Combat view
  const combatView = document.createElement("div");
  combatView.style.cssText = `
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px;
    width: 100%;
  `;
  combatContainer.appendChild(combatView);

  // Combat canvas
  const combatCanvas = document.createElement("canvas");
  combatCanvas.style.maxWidth = "100%";
  combatCanvas.style.boxShadow = "0 8px 24px rgba(0,0,0,0.45)";
  combatView.appendChild(combatCanvas);
  renderCombatUI(combatCanvas, combatState, {
    width: canvasWidth,
    height: canvasHeight,
    backgroundImage: backgroundImage?.complete ? backgroundImage : undefined,
  });

  if (backgroundImage && !backgroundImage.complete) {
    backgroundImage.onload = () => {
      // Re-render to apply the loaded background; pull fresh state in case combat progressed
      const latestState = controller.getCombatState();
      if (latestState) {
        renderCombatUI(combatCanvas, latestState as CombatState, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundImage,
        });
      }
    };
  }

  // Bottom section: Controls and log
  const controlsSection = document.createElement("div");
  controlsSection.style.cssText = `
    display: flex;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
  `;
  combatContainer.appendChild(controlsSection);

  const controlsWrapper = document.createElement("div");
  controlsWrapper.style.cssText = `
    display: flex;
    gap: 20px;
    padding: 12px;
    width: ${Math.max(720, combatLayoutWidth)}px;
    max-width: 100%;
    box-sizing: border-box;
    justify-content: center;
    align-items: stretch;
    height: ${controlsHeight}px;
  `;
  controlsSection.appendChild(controlsWrapper);

  // Combat log
  const logContainer = document.createElement("div");
  logContainer.style.cssText = `
    flex: 1;
    height: 100%;
    min-width: 320px;
  `;
  controlsWrapper.appendChild(logContainer);
  renderCombatLog(logContainer, combatState, 15);

  // Action menu
  const actionContainer = document.createElement("div");
  actionContainer.style.cssText = `
    flex: 1;
    height: 100%;
    min-width: 320px;
  `;
  controlsWrapper.appendChild(actionContainer);

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
      openAbilityModal();
      return;
    }

    if (action.type === "show-items") {
      openItemModal();
      return;
    }

    if (action.type === "select-target") {
      selectedAbilityId = undefined;
      openTargetModal("enemy");
      return;
    }

    if (action.type === "defend") {
      const combatAction: CombatAction = {
        type: "defend",
        actorIndex: action.actorIndex,
        isPlayerAction: true,
      };
      controller.submitCombatAction(combatAction);
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
      rerender();
      return;
    }
  };

  const renderActionMenu = () => {
    actionContainer.innerHTML = "";
    createActionMenu(actionContainer, combatState, handleAction);
  };

  const victorySummary = combatState.victorySummary;
  if (combatState.phase === "victory" && victorySummary) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      box-sizing: border-box;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      background: #0f0f12;
      border: 2px solid #4a4a4a;
      padding: 16px;
      width: min(720px, 95vw);
      color: #e0e0e0;
      font-family: monospace;
      box-shadow: 0 10px 30px rgba(0,0,0,0.45);
    `;

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    const title = document.createElement("h3");
    title.textContent = "Victory Rewards";
    title.style.margin = "0";
    const expLabel = document.createElement("span");
    expLabel.textContent = `+${victorySummary.expGained} XP each`;
    expLabel.style.color = "#7fd0ff";
    header.appendChild(title);
    header.appendChild(expLabel);
    panel.appendChild(header);

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "10px";

    victorySummary.characters.forEach((ch) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "48px 1fr 64px";
      row.style.alignItems = "center";
      row.style.gap = "10px";

      const avatar = document.createElement("div");
      avatar.textContent = ch.name.slice(0, 1);
      avatar.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: #1f1f24;
        border: 2px solid #4a4a4a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #ffd27f;
      `;

      const info = document.createElement("div");
      info.style.display = "flex";
      info.style.flexDirection = "column";
      info.style.gap = "4px";

      const nameRow = document.createElement("div");
      nameRow.textContent = ch.name;
      nameRow.style.fontWeight = "bold";

      const progressWrapper = document.createElement("div");
      progressWrapper.style.cssText = `
        background: #1a1a1f;
        border: 1px solid #3a3a3a;
        height: 10px;
        position: relative;
        overflow: hidden;
        border-radius: 6px;
      `;
      const progressFill = document.createElement("div");
      const beforePercent = ch.expToNextBefore > 0 ? Math.min(100, Math.floor((ch.expBefore / ch.expToNextBefore) * 100)) : 0;
      const afterPercent = ch.expToNextAfter > 0 ? Math.min(100, Math.floor((ch.expAfter / ch.expToNextAfter) * 100)) : 100;
      progressFill.style.cssText = `
        height: 100%;
        width: ${beforePercent}%;
        background: linear-gradient(90deg, #6fc3ff, #4fa1ff);
        transition: width 0.8s ease;
      `;
      requestAnimationFrame(() => {
        progressFill.style.width = `${afterPercent}%`;
      });
      progressWrapper.appendChild(progressFill);

      const levelInfo = document.createElement("div");
      levelInfo.style.display = "flex";
      levelInfo.style.justifyContent = "space-between";
      levelInfo.style.fontSize = "12px";
      levelInfo.style.color = "#b0b0b0";
      levelInfo.textContent = `Lv ${ch.levelBefore} → Lv ${ch.levelAfter}`;

      info.appendChild(nameRow);
      info.appendChild(progressWrapper);
      info.appendChild(levelInfo);

      const xpTag = document.createElement("div");
      xpTag.textContent = ch.levelAfter > ch.levelBefore ? "Level Up!" : "XP gained";
      xpTag.style.cssText = `
        text-align: center;
        padding: 6px 8px;
        border: 1px solid #4a4a4a;
        border-radius: 8px;
        font-size: 12px;
        color: ${ch.levelAfter > ch.levelBefore ? "#7cff9f" : "#8ab6ff"};
      `;

      row.appendChild(avatar);
      row.appendChild(info);
      row.appendChild(xpTag);
      list.appendChild(row);
    });

    panel.appendChild(list);

    if (victorySummary.loot && victorySummary.loot.length > 0) {
      const lootTitle = document.createElement("h4");
      lootTitle.textContent = "Loot";
      lootTitle.style.margin = "12px 0 6px 0";
      panel.appendChild(lootTitle);

      const lootList = document.createElement("div");
      lootList.style.display = "grid";
      lootList.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
      lootList.style.gap = "8px";

      victorySummary.loot.forEach((drop) => {
        const card = document.createElement("div");
        card.style.cssText = `
          padding: 8px;
          background: #16161a;
          border: 1px solid #3a3a3a;
          border-radius: 6px;
        `;
        const name = ITEMS[drop.id]?.name || drop.id;
        card.textContent = `${drop.quantity}x ${name}`;
        lootList.appendChild(card);
      });

      panel.appendChild(lootList);
    }

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Continue";
    closeBtn.style.cssText = `
      margin-top: 12px;
      background: #2a2a2a;
      color: #e0e0e0;
      border: 2px solid #4a4a4a;
      padding: 10px 14px;
      font-family: monospace;
      cursor: pointer;
      width: 100%;
    `;
    closeBtn.addEventListener("click", () => handleAction({ type: "end-combat" }));

    panel.appendChild(closeBtn);
    overlay.appendChild(panel);
    combatContainer.appendChild(overlay);
  }

  const openCombatModal = (
    title: string,
    buildContent: (content: HTMLDivElement) => void
  ) => {
    closeCombatModal();
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(5, 5, 10, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 16px;
      box-sizing: border-box;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: #0c0c14;
      border: 2px solid #4a4a4a;
      box-shadow: 0 12px 32px rgba(0,0,0,0.55);
      width: min(720px, 90vw);
      max-height: 80vh;
      overflow-y: auto;
      border-radius: 6px;
      padding: 16px;
      box-sizing: border-box;
      color: #e0e0e0;
      font-family: monospace;
    `;

    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      font-weight: bold;
      color: #ffcc00;
    `;
    header.textContent = title;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.cssText = `
      background: #2a2a2a;
      color: #e0e0e0;
      border: 1px solid #4a4a4a;
      padding: 4px 10px;
      cursor: pointer;
      font-weight: bold;
    `;
    closeBtn.addEventListener("click", () => closeCombatModal());
    header.appendChild(closeBtn);

    const content = document.createElement("div");
    buildContent(content);

    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeCombatModal();
      }
    });

    document.body.appendChild(overlay);
    combatActionModal = overlay;
  };

  const submitAbilityAction = (abilityId: string, targetIndex?: number) => {
    const latestState = controller.getCombatState() as CombatState;
    const currentActor = getCurrentActor(latestState);
    if (!currentActor || !currentActor.isPlayer) return;

    const combatAction: CombatAction = {
      type: "ability",
      actorIndex: currentActor.index,
      targetIndex,
      abilityId,
      isPlayerAction: true,
    };
    controller.submitCombatAction(combatAction);
    selectedAbilityId = undefined;
    closeCombatModal();
    rerender();
  };

  const submitTarget = (targetIndex: number) => {
    const latestState = controller.getCombatState() as CombatState;
    const currentActor = getCurrentActor(latestState);
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

    closeCombatModal();
    rerender();
  };

  const openTargetModal = (targetType: "enemy" | "ally") => {
    const latestState = controller.getCombatState() as CombatState;
    const modalTitle = targetType === "ally" ? "Select ally" : "Select enemy";

    openCombatModal(modalTitle, (content) => {
      const list = document.createElement("div");
      list.style.display = "grid";
      list.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
      list.style.gap = "10px";

      if (targetType === "ally") {
        const allies = latestState.party.members
          .map((member, index) => ({ member, index }))
          .filter(({ member }) => member.alive);

        allies.forEach(({ member, index }) => {
          const btn = document.createElement("button");
          btn.textContent = `${member.name} (HP: ${member.stats.hp}/${member.stats.maxHp})`;
          btn.style.cssText = `
            background: rgba(26,26,26,0.65);
            color: #e0e0e0;
            border: 2px solid #4a4a4a;
            padding: 10px 12px;
            font-family: monospace;
            cursor: pointer;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          `;
          btn.addEventListener("click", () => submitTarget(index));
          list.appendChild(btn);
        });
      } else {
        const enemies = latestState.encounter.enemies
          .map((enemy, index) => ({ enemy, index }))
          .filter(({ enemy }) => enemy.alive);

        enemies.forEach(({ enemy, index }) => {
          const btn = document.createElement("button");
          btn.textContent = `${enemy.name} (HP: ${enemy.stats.hp}/${enemy.stats.maxHp})`;
          btn.style.cssText = `
            background: rgba(26,26,26,0.65);
            color: #e0e0e0;
            border: 2px solid #4a4a4a;
            padding: 10px 12px;
            font-family: monospace;
            cursor: pointer;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          `;
          btn.addEventListener("click", () => submitTarget(index));
          list.appendChild(btn);
        });
      }

      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.style.cssText = `
        margin-top: 10px;
        background: #2a2a2a;
        color: #e0e0e0;
        border: 2px solid #4a4a4a;
        padding: 8px 12px;
        font-family: monospace;
        cursor: pointer;
      `;
      backBtn.addEventListener("click", () => {
        selectedAbilityId = undefined;
        closeCombatModal();
      });

      content.appendChild(list);
      content.appendChild(backBtn);
    });
  };

  const openAbilityModal = () => {
    const latestState = controller.getCombatState() as CombatState;
    const currentActor = getCurrentActor(latestState);
    if (!currentActor || !currentActor.isPlayer) return;
    const character = latestState.party.members[currentActor.index];
    if (!character) return;

    const abilities = getCharacterAbilities(character.id);
    openCombatModal("Select ability", (content) => {
      const list = document.createElement("div");
      list.style.display = "grid";
      list.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
      list.style.gap = "10px";

      abilities.forEach((ability) => {
        const canUse = canUseAbility(ability, character);
        const costLabel = ability.cost?.sanity ? ` (${ability.cost.sanity} SAN)` : "";
        const btn = document.createElement("button");
        btn.textContent = `${ability.name}${costLabel}`;
        btn.disabled = !canUse;
        btn.style.cssText = `
          background: ${canUse ? "rgba(26,26,26,0.65)" : "#3a3a3a"};
          color: ${canUse ? "#e0e0e0" : "#777"};
          border: 2px solid #4a4a4a;
          padding: 10px 12px;
          font-family: monospace;
          cursor: ${canUse ? "pointer" : "not-allowed"};
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        `;
        btn.addEventListener("click", () => {
          if (!canUse) return;
          const targetType = ability.targetType;
          const current = getCurrentActor(controller.getCombatState() as CombatState);
          if (!current || !current.isPlayer) return;

          if (targetType === "self") {
            submitAbilityAction(ability.id, current.index);
            return;
          }

          if (targetType === "ally") {
            selectedAbilityId = ability.id;
            openTargetModal("ally");
            return;
          }

          if (targetType === "all-allies" || targetType === "all-enemies" || targetType === "all") {
            submitAbilityAction(ability.id);
            return;
          }

          // Default to enemy targeting
          selectedAbilityId = ability.id;
          openTargetModal("enemy");
        });

        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "4px";
        item.appendChild(btn);

        const desc = document.createElement("div");
        desc.textContent = ability.description;
        desc.style.cssText = `
          font-size: 11px;
          color: #b0b0b0;
          padding: 0 4px;
        `;
        item.appendChild(desc);

        list.appendChild(item);
      });

      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.style.cssText = `
        margin-top: 10px;
        background: #2a2a2a;
        color: #e0e0e0;
        border: 2px solid #4a4a4a;
        padding: 8px 12px;
        font-family: monospace;
        cursor: pointer;
      `;
      backBtn.addEventListener("click", () => {
        selectedAbilityId = undefined;
        closeCombatModal();
      });

      content.appendChild(list);
      content.appendChild(backBtn);
    });
  };

  const getItemTargetType = (itemId: string): "ally" | "enemy" | "none" => {
    switch (itemId) {
      case "bomb":
        return "enemy";
      case "smoke_bomb":
        return "none";
      default:
        return "ally";
    }
  };

  const openItemTargetModal = (itemId: string, targetType: "ally" | "enemy") => {
    const latestState = controller.getCombatState() as CombatState;
    const current = getCurrentActor(latestState);
    if (!current || !current.isPlayer) return;

    openCombatModal("Select target", (content) => {
      const list = document.createElement("div");
      list.style.display = "grid";
      list.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
      list.style.gap = "10px";

      const submitTarget = (index: number) => {
        const combatAction: CombatAction = {
          type: "item",
          actorIndex: current.index,
          targetIndex: index,
          itemId,
          isPlayerAction: true,
          targetIsEnemy: targetType === "enemy",
        };
        controller.submitCombatAction(combatAction);
        closeCombatModal();
        rerender();
      };

      if (targetType === "ally") {
        const allies = latestState.party.members
          .map((ally, index) => ({ ally, index }))
          .filter(({ ally }) => ally.alive);
        allies.forEach(({ ally, index }) => {
          const btn = document.createElement("button");
          btn.textContent = `${ally.name} (HP ${ally.stats.hp}/${ally.stats.maxHp}, SAN ${ally.stats.sanity}/${ally.stats.maxSanity})`;
          btn.style.cssText = `
            background: rgba(26,26,26,0.65);
            color: #e0e0e0;
            border: 2px solid #4a4a4a;
            padding: 10px 12px;
            font-family: monospace;
            cursor: pointer;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          `;
          btn.addEventListener("click", () => submitTarget(index));
          list.appendChild(btn);
        });
      } else {
        const enemies = latestState.encounter.enemies
          .map((enemy, index) => ({ enemy, index }))
          .filter(({ enemy }) => enemy.alive);
        enemies.forEach(({ enemy, index }) => {
          const btn = document.createElement("button");
          btn.textContent = `${enemy.name} (HP ${enemy.stats.hp}/${enemy.stats.maxHp})`;
          btn.style.cssText = `
            background: rgba(26,26,26,0.65);
            color: #e0e0e0;
            border: 2px solid #4a4a4a;
            padding: 10px 12px;
            font-family: monospace;
            cursor: pointer;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          `;
          btn.addEventListener("click", () => submitTarget(index));
          list.appendChild(btn);
        });
      }

      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.style.cssText = `
        margin-top: 10px;
        background: #2a2a2a;
        color: #e0e0e0;
        border: 2px solid #4a4a4a;
        padding: 8px 12px;
        font-family: monospace;
        cursor: pointer;
      `;
      backBtn.addEventListener("click", () => {
        closeCombatModal();
      });

      content.appendChild(list);
      content.appendChild(backBtn);
    });
  };

  const openItemModal = () => {
    const latestState = controller.getCombatState() as CombatState;
    const current = getCurrentActor(latestState);
    if (!current || !current.isPlayer) return;
    const usableItems = latestState.party.inventory.items.filter((i) => i.item.usable && i.quantity > 0);

    if (usableItems.length === 0) {
    openCombatModal("Empty inventory", (content) => {
        const message = document.createElement("p");
        message.textContent = "No tienes objetos utilizables.";
        content.appendChild(message);
        const backBtn = document.createElement("button");
        backBtn.textContent = "Back";
        backBtn.addEventListener("click", () => closeCombatModal());
        content.appendChild(backBtn);
      });
      return;
    }

    openCombatModal("Select item", (content) => {
      const list = document.createElement("div");
      list.style.display = "grid";
      list.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
      list.style.gap = "10px";

      const descriptionBox = document.createElement("div");
      descriptionBox.style.cssText = `
        margin-top: 8px;
        padding: 8px 10px;
        background: rgba(20,20,20,0.7);
        border: 1px solid #4a4a4a;
        color: #cfcfcf;
        font-size: 12px;
        min-height: 32px;
      `;
      descriptionBox.textContent = "Select ? to view an item description.";

      usableItems.forEach(({ item, quantity }) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "6px";

        const btn = document.createElement("button");
        btn.textContent = `${item.name} x${quantity}`;
        btn.style.cssText = `
          background: rgba(26,26,26,0.65);
          color: #e0e0e0;
          border: 2px solid #4a4a4a;
          padding: 10px 12px;
          font-family: monospace;
          cursor: pointer;
          text-align: left;
          flex: 1;
          box-sizing: border-box;
        `;
        btn.addEventListener("click", () => {
          const targetType = getItemTargetType(item.id);
          if (targetType === "none") {
            const combatAction: CombatAction = {
              type: "item",
              actorIndex: current.index,
              itemId: item.id,
              isPlayerAction: true,
            };
            controller.submitCombatAction(combatAction);
            closeCombatModal();
            rerender();
          } else {
            openItemTargetModal(item.id, targetType);
          }
        });

        const infoBtn = document.createElement("button");
        infoBtn.textContent = "?";
        infoBtn.style.cssText = `
          width: 36px;
          background: #333;
          color: #ffd27f;
          border: 2px solid #4a4a4a;
          font-weight: bold;
          cursor: pointer;
        `;
        infoBtn.addEventListener("click", () => {
          descriptionBox.textContent = item.description || "No description available.";
        });

        row.appendChild(btn);
        row.appendChild(infoBtn);
        list.appendChild(row);
      });

      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.style.cssText = `
        margin-top: 10px;
        background: #2a2a2a;
        color: #e0e0e0;
        border: 2px solid #4a4a4a;
        padding: 8px 12px;
        font-family: monospace;
        cursor: pointer;
      `;
      backBtn.addEventListener("click", () => {
        closeCombatModal();
      });

      content.appendChild(list);
      content.appendChild(descriptionBox);
      content.appendChild(backBtn);
    });
  };

  renderActionMenu();
}

export function initApp(root: HTMLElement): void {
  const controller = new GameController();

  const render = (): void => {
    root.innerHTML = "";
    const state = controller.getState();

    // Clean up mobile controls when not in exploration mode
    if (state.mode !== "exploration" && mobileControls) {
      mobileControls.cleanup();
      mobileControls = null;
    }
    if (state.mode !== "exploration") {
      closeMinimapModal();
    }
    if (state.mode !== "combat") {
      closeCombatModal();
    }

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

function getCombatBackground(src: string): HTMLImageElement | undefined {
  if (combatBackgroundCache[src]) return combatBackgroundCache[src];
  const img = new Image();
  img.src = src;
  combatBackgroundCache[src] = img;
  return img;
}

function getAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  return `${normalizedBase}${normalizedPath}`;
}

function closeCombatModal(): void {
  if (combatActionModal) {
    combatActionModal.remove();
    combatActionModal = null;
  }
}
