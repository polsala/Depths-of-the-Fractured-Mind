import type { GameState } from "../game/state";
import type { GameEvent } from "../game/events/engine";
import { getChoiceUnavailableReason, getEventById } from "../game/events/engine";
import { GameController } from "../game/index";
import { audioManager } from "./audio";
import { readPreferences, updatePreferences } from "./preferences";
import { renderTitle, resetTitleMusic } from "./screens/title";
import { renderGameOver } from "./screens/game-over";
import { renderDialogue } from "./screens/dialogue";
import { renderEnding } from "./screens/ending";
import { getCurrentObjective, getStoryConsequence } from "../game/objectives";
import { getDialogue, getDialogueChoiceUnavailableReason } from "../game/dialogue";
import type { SaveActions } from "./screens/types";
import { setSoundSink } from "../game/sound";
import { SaveRepository, type SaveStorage } from "../game/save";
import { assetUrl, MUSIC_BY_DEPTH } from "../assets/manifest";
import { DungeonViewport } from "../graphics/DungeonViewport";
import { ExplorationCommandQueue, type ExplorationCommand } from "./exploration-commands";
import { renderPartyUI } from "../graphics/party-ui";
import { renderMinimap, type MinimapConfig } from "../graphics/minimap";
import {
  getDirectionArrow,
  getDirectionName,
} from "../graphics/direction";
import {
  renderCombatUI,
  renderCombatLog,
  createActionMenu,
  type CombatVisualCue,
} from "../graphics/combat-ui";
import type { CombatState, CombatAction } from "../game/combat/state";
import { getCurrentActor } from "../game/combat/state";
import { getCharacterAbilities, canUseAbility, getAbility } from "../game/abilities";
import { ITEMS } from "../game/inventory";
import { getCharacterLevel } from "../game/experience";
import { detectPlatform, getResponsiveViewportSize, getResponsiveUISize } from "../utils/platform";
import { createMobileControls, type MobileControls } from "./mobile-controls";
import { generateDepthMap, type DungeonMap } from "../graphics/map";
import { openVendorModal } from "./vendor";
import { PresenceDirector, type PresenceAction } from "../graphics/presence/PresenceDirector";
import { PresenceView, presenceLifecycle } from "./presence-view";
import { createHeroPortrait } from "../assets/hero-portraits";
import type { CharacterId } from "../game/state";

const combatBackgroundCache: Record<string, HTMLImageElement> = {};

let dungeonRenderContext: { depthMaps: Map<number, DungeonMap> } | null = null;
let dungeonViewport: DungeonViewport | null = null;
let dispatchExploration: (command: ExplorationCommand) => void = () => {};
let flushExploration: () => void = () => {};
let cancelExploration: () => void = () => {};
let currentDepthMusic: number = -1; // Track current depth for music changes
let selectedAbilityId: string | undefined;
let mobileControls: MobileControls | null = null;
let minimapModal: HTMLDivElement | null = null;
let minimapModalCanvas: HTMLCanvasElement | null = null;
let minimapModalConfig: MinimapConfig | null = null;
let combatActionModal: HTMLDivElement | null = null;
let combatVisualCue: CombatVisualCue | null = null;
let partyMotionUntil = 0;
let partyMotionFacing: "north" | "south" | "east" | "west" = "north";
const presence = new PresenceDirector();
let presenceView: PresenceView | null = null;

function syncPresence(state: GameState): void {
  const actor = state.combatState ? getCurrentActor(state.combatState) : null;
  presence.sync(state, actor?.isPlayer ? state.party.members[actor.index]?.id : undefined);
}

function presenceHidden(): boolean {
  return !!document.querySelector('[role="dialog"], .settings-control[open]')
    || (document.querySelector(".dungeon-viewport")?.getAttribute("data-ready") ?? "true") !== "true";
}

function prefersReducedMotion(): boolean {
  const choice = readPreferences().motion;
  return choice === "reduced" || (choice === "system" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function activateDialog(overlay: HTMLElement, panel: HTMLElement, label: string, close: () => void): void {
  cancelExploration();
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", label);
  panel.classList.add("modal-panel");
  const opener = document.activeElement as HTMLElement | null;
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const controls = [...overlay.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), [href]")]
      .filter((element) => element.getClientRects().length > 0);
    if (!controls.length) return;
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
  });
  const observer = new MutationObserver(() => {
    if (overlay.isConnected) return;
    observer.disconnect();
    if (opener?.isConnected) opener.focus();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  requestAnimationFrame(() => {
    if (overlay.isConnected) (overlay.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled)") ?? panel).focus();
  });
}

function renderSettings(root: HTMLElement, rerender: () => void): void {
  const preferences = readPreferences();
  const settings = document.createElement("details");
  settings.className = "settings-control";
  const summary = document.createElement("summary");
  summary.textContent = "Settings";
  settings.appendChild(summary);
  const panel = document.createElement("div");
  panel.className = "settings-panel";
  panel.innerHTML = "<h2>Audio & display</h2>";

  const slider = (name: string, value: number, onChange: (value: number) => void) => {
    const label = document.createElement("label");
    label.textContent = `${name}: ${value}%`;
    const input = document.createElement("input");
    input.type = "range"; input.min = "0"; input.max = "100"; input.value = String(value);
    input.setAttribute("aria-label", `${name} volume`);
    input.addEventListener("input", () => {
      label.firstChild!.textContent = `${name}: ${input.value}%`;
      onChange(Number(input.value));
    });
    label.appendChild(input); panel.appendChild(label);
  };
  slider("Music", preferences.music, (value) => audioManager.setMusicVolume(value / 100));
  slider("SFX", preferences.sfx, (value) => audioManager.setSfxVolume(value / 100));

  const motionLabel = document.createElement("label");
  motionLabel.textContent = "Motion";
  const motion = document.createElement("select");
  for (const [value, label] of [["system", "Follow device"], ["reduced", "Reduce"], ["full", "Full"]]) {
    const option = document.createElement("option");
    option.value = value; option.textContent = label; motion.appendChild(option);
  }
  motion.value = preferences.motion;
  motion.addEventListener("change", () => { updatePreferences({ motion: motion.value as typeof preferences.motion }); rerender(); });
  motionLabel.appendChild(motion); panel.appendChild(motionLabel);

  const qualityLabel = document.createElement("label");
  qualityLabel.textContent = "3D quality";
  const quality = document.createElement("select");
  for (const [value, label] of [["low", "Low · battery"], ["balanced", "Balanced"], ["high", "High · detail"]]) {
    const option = document.createElement("option"); option.value = value; option.textContent = label; quality.appendChild(option);
  }
  quality.value = preferences.quality;
  quality.addEventListener("change", () => { updatePreferences({ quality: quality.value as typeof preferences.quality }); rerender(); });
  qualityLabel.appendChild(quality); panel.appendChild(qualityLabel);

  const textLabel = document.createElement("label");
  textLabel.textContent = "Text size";
  const textSize = document.createElement("select");
  for (const value of [100, 125, 150, 200]) {
    const option = document.createElement("option");
    option.value = String(value); option.textContent = `${value}%`; textSize.appendChild(option);
  }
  textSize.value = String(preferences.textScale);
  textSize.addEventListener("change", () => {
    const next = updatePreferences({ textScale: Number(textSize.value) });
    document.documentElement.style.fontSize = `${next.textScale}%`;
  });
  textLabel.appendChild(textSize); panel.appendChild(textLabel);
  settings.appendChild(panel);
  summary.addEventListener("click", () => cancelExploration());
  settings.addEventListener("toggle", () => { if (settings.open) cancelExploration(); });
  settings.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { settings.open = false; summary.focus(); }
  });
  root.prepend(settings);
}

function animateCanvas(canvas: HTMLCanvasElement, draw: (now: number) => void): void {
  let lastFrame = 0;
  const tick = (now: number) => {
    if (!canvas.isConnected) return;
    if (now - lastFrame >= 120) { draw(now); lastFrame = now; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Preserve the exploration shell (and its listeners/canvases) for ordinary moves.
// Mode and depth changes still build the appropriate new screen.
function refreshExploration(root: HTMLElement, state: GameState, controller: GameController): void {
  if (!dungeonRenderContext) return;
  // Keep the graphics projection in sync with mutable pickups, doors and traps.
  dungeonRenderContext.depthMaps.set(state.location.depth, generateDepthMap(state.location.depth, state.depthMaps));
  dungeonViewport?.update(state, prefersReducedMotion());
  refreshInteraction(root, controller);
  refreshCompactParty(root, state);
  const facing = state.location.direction ?? "north";
  const location = root.querySelector<HTMLElement>(".location-info");
  if (location) location.innerHTML = `<h3>Depth ${state.location.depth}</h3><p>Position: (${state.location.x}, ${state.location.y})</p><p class="direction-indicator">Facing: ${getDirectionArrow(facing)} ${getDirectionName(facing)}</p>`;
  const map = dungeonRenderContext.depthMaps.get(state.location.depth);
  const minimap = root.querySelector<HTMLCanvasElement>(".minimap-panel");
  if (map && minimap) {
    const platform = detectPlatform();
    const size = getResponsiveUISize("minimap");
    renderMinimap(minimap, map, state.location.x, state.location.y, facing, {
      width: size.width, height: size.height, tileSize: platform === "mobile" ? 12 : 14,
    });
    if (minimapModal) renderMinimapModal(map, state.location.x, state.location.y, facing, platform);
  }
  const partyCanvas = root.querySelector<HTMLCanvasElement>(".party-panel");
  if (partyCanvas) renderPartyUI(partyCanvas, state.party, {
    width: partyCanvas.width, height: partyCanvas.height,
    portraitSize: detectPlatform() === "mobile" ? 48 : 64,
    facing: performance.now() < partyMotionUntil ? partyMotionFacing : undefined,
    timeMs: performance.now(), reducedMotion: prefersReducedMotion(),
  });
  const partyDescription = root.querySelector<HTMLElement>(".party-description");
  if (partyDescription) partyDescription.textContent = state.party.members.map((member) =>
    `${member.name}: ${member.alive ? "alive" : "fallen"}, HP ${member.stats.hp}/${member.stats.maxHp}, sanity ${member.stats.sanity}/${member.stats.maxSanity}${member.statusEffects.length ? `, ${member.statusEffects.join(", ")}` : ""}`).join("; ");
  root.querySelector(".dungeon-viewport")?.setAttribute("aria-label",
    `First-person view through ${presence.person?.name ?? "the party"}, depth ${state.location.depth}, position ${state.location.x}, ${state.location.y}, facing ${getDirectionName(facing)}`);
  root.querySelector(".minimap-panel")?.setAttribute("aria-label",
    `Map of depth ${state.location.depth}; current position ${state.location.x}, ${state.location.y}`);
  const vendorButton = root.querySelector<HTMLButtonElement>(".vendor-button");
  if (vendorButton) vendorButton.hidden = !state.depthMaps?.get(state.location.depth)?.tiles[state.location.y]?.[state.location.x]?.vendor;
  const npcButton = root.querySelector<HTMLButtonElement>(".npc-button");
  if (npcButton) npcButton.hidden = !controller.getNearbyNpcId() || controller.getInteraction()?.id === "intake-keeper";
  const objective = root.querySelector<HTMLElement>(".current-objective");
  if (objective) fillObjective(objective, state);
}

function refreshInteraction(root: HTMLElement, controller: GameController): void {
  const interaction = controller.getInteraction();
  const button = root.querySelector<HTMLButtonElement>(".interact-button");
  if (button) {
    button.hidden = !interaction;
    button.textContent = interaction ? `${interaction.label} · F` : "Inspect";
  }
  const description = root.querySelector<HTMLElement>(".interaction-description");
  if (description) description.textContent = interaction?.description ?? "WASD / arrows to move · Q E to turn · T to talk";
  const notice = root.querySelector<HTMLElement>(".exploration-notice");
  if (notice) notice.textContent = controller.getExplorationNotice();
}

function refreshCompactParty(root: HTMLElement, state: GameState): void {
  const strip = root.querySelector<HTMLElement>(".compact-party");
  if (!strip) return;
  const focused = strip.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.character : undefined;
  strip.replaceChildren();
  for (const member of state.party.members) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "compact-party-member";
    item.dataset.character = member.id;
    item.disabled = !member.alive;
    item.setAttribute("aria-pressed", String(presence.selected === member.id));
    item.title = `View through ${member.name}`;
    const portrait = createHeroPortrait(member, detectPlatform() === "mobile" ? 32 : 40);
    portrait.setAttribute("aria-hidden", "true");
    const name = document.createElement("strong");
    name.textContent = ({ elias: "Elias", miriam: "Miriam", subject13: "13", anya: "Anya" })[member.id];
    const values = document.createElement("span");
    values.textContent = member.alive ? `${member.stats.hp} HP / ${member.stats.sanity} SAN` : "Fallen";
    const instruction = document.createElement("span");
    instruction.className = "viewpoint-instruction";
    instruction.textContent = ` · View through ${member.name}`;
    item.addEventListener("click", () => {
      presence.select(member.id); presenceView?.draw(performance.now());
      for (const button of strip.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.character === presence.selected));
      root.querySelector(".dungeon-viewport")?.setAttribute("aria-label",
        `First-person view through ${presence.person?.name ?? "the party"}, depth ${state.location.depth}, position ${state.location.x}, ${state.location.y}, facing ${getDirectionName(state.location.direction ?? "north")}`);
    });
    item.append(portrait, name, document.createTextNode(" "), values, instruction); strip.appendChild(item);
  }
  if (focused) strip.querySelector<HTMLButtonElement>(`button[data-character="${focused}"]:not(:disabled)`)?.focus({ preventScroll: true });
}

function fillObjective(element: HTMLElement, state: GameState): void {
  const objective = getCurrentObjective(state);
  element.replaceChildren();
  const chapter = document.createElement("small");
  chapter.textContent = objective.chapter;
  const title = document.createElement("h3");
  title.textContent = objective.title;
  const guidance = document.createElement("p");
  guidance.textContent = objective.guidance;
  element.append(chapter, title, guidance);
  if (objective.consequence) {
    const consequence = document.createElement("p");
    consequence.className = "objective-consequence";
    consequence.textContent = objective.consequence;
    element.appendChild(consequence);
  }
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
    activateDialog(minimapModal, modal, "Expanded minimap", closeMinimapModal);
  }

  if (minimapModalCanvas && minimapModalConfig) {
    renderMinimap(minimapModalCanvas, map, x, y, direction, minimapModalConfig);
  }
}

function renderExploration(
  root: HTMLElement,
  controller: GameController,
  state: GameState,
  rerender: () => void,
  saves: SaveActions
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
    const musicTrack = MUSIC_BY_DEPTH[state.location.depth];
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
  viewportCanvas.width = viewportSize.width;
  viewportCanvas.height = viewportSize.height;
  viewportCanvas.setAttribute("role", "img");
  viewportCanvas.setAttribute("aria-label", `First-person view through ${presence.person?.name ?? "the party"}, depth ${state.location.depth}, position ${state.location.x}, ${state.location.y}, facing ${getDirectionName(facingDirection)}`);
  const presenceStage = document.createElement("div");
  presenceStage.className = "presence-stage";
  presenceStage.appendChild(viewportCanvas);
  viewportContainer.appendChild(presenceStage);
  presenceView = new PresenceView(presence, prefersReducedMotion, presenceHidden);
  presenceStage.appendChild(presenceView.element);

  dungeonRenderContext = { depthMaps: new Map([[state.location.depth, generateDepthMap(state.location.depth, state.depthMaps)]]) };
  dungeonViewport = new DungeonViewport(viewportCanvas, state, readPreferences().quality, prefersReducedMotion(), () => flushExploration());
  const viewCaption = document.createElement("div");
  viewCaption.className = "view-caption";
  viewCaption.innerHTML = '<span>THE FACILITY / INTAKE</span><span>DEPTH ' + state.location.depth + '</span>';
  viewportContainer.prepend(viewCaption);
  const compactParty = document.createElement("div");
  compactParty.className = "compact-party";
  compactParty.setAttribute("role", "group");
  compactParty.setAttribute("aria-label", "Party and viewpoint");
  viewportContainer.appendChild(compactParty);
  refreshCompactParty(root, state);
  const contextActions = document.createElement("div");
  contextActions.className = "context-actions";
  const interactButton = document.createElement("button");
  interactButton.className = "interact-button";
  interactButton.addEventListener("click", () => dispatchExploration("interact"));
  const interactionDescription = document.createElement("p");
  interactionDescription.className = "interaction-description";
  const notice = document.createElement("p");
  notice.className = "exploration-notice"; notice.setAttribute("role", "status");
  contextActions.append(interactButton, interactionDescription, notice);
  viewportContainer.appendChild(contextActions);
  refreshInteraction(root, controller);

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

  const objectivePanel = document.createElement("section");
  objectivePanel.className = "current-objective";
  objectivePanel.setAttribute("aria-label", "Current objective");
  fillObjective(objectivePanel, state);
  if (platform === "mobile") root.insertBefore(objectivePanel, container);
  else infoPanel.appendChild(objectivePanel);

  // Create and render minimap
  if (dungeonRenderContext && dungeonRenderContext.depthMaps) {
    const map = dungeonRenderContext.depthMaps.get(state.location.depth);
    if (map) {
      const minimapWrapper = document.createElement("div");
      minimapWrapper.className = "minimap-wrapper";
      minimapWrapper.style.cssText = `
        border: 1px solid #444;
        padding: 8px;
        background: #0f0f0f;
        display: flex;
        gap: 8px;
        align-items: center;
      `;
      infoPanel.appendChild(minimapWrapper);

      const minimapCanvas = document.createElement("canvas");
      minimapCanvas.className = "minimap-panel";
      minimapCanvas.setAttribute("role", "img");
      minimapCanvas.setAttribute("aria-label", `Map of depth ${state.location.depth}; current position ${state.location.x}, ${state.location.y}`);
      minimapCanvas.style.flex = "1 1 auto";
      minimapWrapper.appendChild(minimapCanvas);

      const zoomButton = document.createElement("button");
      zoomButton.className = "minimap-zoom-button";
      zoomButton.type = "button";
      zoomButton.setAttribute("aria-label", "Expand minimap");
      zoomButton.style.flex = "0 0 auto";
      zoomButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none" />
          <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      `;
      zoomButton.addEventListener("click", () => {
        const current = controller.getState();
        const currentMap = dungeonRenderContext?.depthMaps.get(current.location.depth);
        if (!currentMap) return;
        renderMinimapModal(
          currentMap,
          current.location.x,
          current.location.y,
          current.location.direction ?? "north",
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
      const legend = document.createElement("p");
      legend.className = "map-legend";
      legend.textContent = "Map: blue = you · red = down stair · gold = event · teal = character · violet = vendor";
      infoPanel.appendChild(legend);

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
  const partyWrapper = document.createElement("div");
  partyWrapper.className = "party-wrapper";
  partyWrapper.style.cssText = `
    border: 1px solid #444;
    padding: 8px;
    background: #0f0f0f;
    margin-top: 10px;
  `;
  const partyCanvas = document.createElement("canvas");
  partyCanvas.className = "party-panel";
  partyCanvas.setAttribute("aria-hidden", "true");
  partyCanvas.style.width = "100%";
  partyWrapper.appendChild(partyCanvas);
  const partyDetails = document.createElement("details");
  partyDetails.className = "party-vitals";
  const partySummary = document.createElement("summary");
  partySummary.textContent = "Party vitals";
  partyDetails.append(partySummary, partyWrapper);
  infoPanel.appendChild(partyDetails);

  // Render party UI with responsive size
  const portraitSizeForParty = platform === 'mobile' ? 48 : 64;
  const wrapperWidth = Math.max(240, (partyWrapper.clientWidth || partyUISize.width || 240) - 16);
  const partyPanelHeight = Math.max(partyUISize.height, state.party.members.length * Math.max(portraitSizeForParty + 20, 84) + 8);
  partyCanvas.width = wrapperWidth;
  partyCanvas.height = partyPanelHeight;
  renderPartyUI(partyCanvas, state.party, {
    width: wrapperWidth,
    height: partyPanelHeight,
    portraitSize: portraitSizeForParty,
    timeMs: performance.now(), reducedMotion: prefersReducedMotion(),
  });
  const partyDescription = document.createElement("p");
  partyDescription.className = "party-description";
  partyDescription.textContent = state.party.members.map((member) =>
    `${member.name}: ${member.alive ? "alive" : "fallen"}, HP ${member.stats.hp}/${member.stats.maxHp}, sanity ${member.stats.sanity}/${member.stats.maxSanity}${member.statusEffects.length ? `, ${member.statusEffects.join(", ")}` : ""}`).join("; ");
  partyWrapper.appendChild(partyDescription);
  animateCanvas(partyCanvas, (now) => {
    const current = controller.getState();
    if (current.mode !== "exploration" || !partyDetails.open) return;
    renderPartyUI(partyCanvas, current.party, {
      width: wrapperWidth, height: partyPanelHeight, portraitSize: portraitSizeForParty,
      facing: now < partyMotionUntil ? partyMotionFacing : undefined,
      timeMs: now, reducedMotion: prefersReducedMotion(),
    });
  });

  // Party status and inventory box
  const utilityBox = document.createElement("div");
  utilityBox.className = "exploration-utilities";
  utilityBox.style.cssText = `
    margin-top: 10px;
    border: 1px solid #444;
    padding: 10px;
    background: #0f0f0f;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `;

  const statusBtn = document.createElement("button");
  statusBtn.textContent = "Party Status";
  statusBtn.addEventListener("click", () => openPartyStatusModal(controller.getState(), controller, rerender));
  utilityBox.appendChild(statusBtn);

  const inventoryBtn = document.createElement("button");
  inventoryBtn.textContent = "Inventory";
  inventoryBtn.addEventListener("click", () => openInventoryModal(controller.getState(), controller, rerender));
  utilityBox.appendChild(inventoryBtn);

  infoPanel.appendChild(utilityBox);

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save Now";
  saveButton.addEventListener("click", saves.save);
  utilityBox.appendChild(saveButton);
  const exportButton = document.createElement("button");
  exportButton.textContent = "Export Save";
  exportButton.addEventListener("click", saves.export);
  utilityBox.appendChild(exportButton);
  const titleButton = document.createElement("button");
  titleButton.textContent = "Save & Return to Title";
  titleButton.addEventListener("click", saves.returnToTitle);
  utilityBox.appendChild(titleButton);

  // Vendor button if on vendor tile
  const currentMap = dungeonRenderContext?.depthMaps?.get(state.location.depth);
  const vendorTile = currentMap?.[state.location.y]?.[state.location.x]?.vendor;
  const vendorBtn = document.createElement("button");
  vendorBtn.className = "vendor-button";
  vendorBtn.textContent = "Talk to Vendor";
  vendorBtn.style.marginTop = "8px";
  vendorBtn.hidden = !vendorTile;
  vendorBtn.addEventListener("click", () => openVendorModal(controller.getState(), controller, rerender));
  infoPanel.appendChild(vendorBtn);

  const npcBtn = document.createElement("button");
  npcBtn.className = "npc-button";
  npcBtn.textContent = "Talk to the Keeper";
  npcBtn.hidden = !controller.getNearbyNpcId() || controller.getInteraction()?.id === "intake-keeper";
  npcBtn.addEventListener("click", () => {
    dispatchExploration("talk");
  });
  infoPanel.appendChild(npcBtn);

  // Instructions - show appropriate controls based on platform
  const instructions = document.createElement("div");
  instructions.className = "instructions";
  if (platform === 'mobile') {
    instructions.innerHTML = `
      <p><strong>Controls:</strong></p>
      <p>Use on-screen D-pad to move</p>
      <p>Q/E buttons to turn</p>
      <p>Use the named action below the view to interact</p>
    `;
  } else {
    instructions.innerHTML = `
      <p><strong>Controls:</strong></p>
      <p>W/↑ - Move Forward</p>
      <p>S/↓ - Move Backward</p>
      <p>A/← - Strafe Left</p>
      <p>D/→ - Strafe Right</p>
      <p>Q - Turn Left, E - Turn Right</p>
      <p>F - Use the named interaction</p>
      <p>T - Talk to a nearby character</p>
    `;
  }
  infoPanel.appendChild(instructions);

  // Create mobile controls if on mobile platform
  if (platform === 'mobile') {
    // Clean up existing mobile controls if any
    if (mobileControls) {
      mobileControls.cleanup();
    }

    mobileControls = createMobileControls({
      onMoveForward: () => dispatchExploration("forward"),
      onMoveBackward: () => dispatchExploration("backward"),
      onStrafeLeft: () => dispatchExploration("left"),
      onStrafeRight: () => dispatchExploration("right"),
      onTurnLeft: () => dispatchExploration("turnLeft"),
      onTurnRight: () => dispatchExploration("turnRight"),
    });

    // Keep controls in document flow, adjacent to the view they operate. A
    // fixed overlay obscured the minimap and essential actions at phone sizes.
    mobileControls.container.setAttribute("aria-label", "Touch movement and turning controls");
    viewportContainer.appendChild(mobileControls.container);
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

  const bossSelect = document.createElement("select");
  bossSelect.setAttribute("aria-label", "Boss depth for developer test");
  bossSelect.style.marginLeft = "8px";
  [1, 2, 3, 4, 5].forEach((depth) => {
    const opt = document.createElement("option");
    opt.value = String(depth);
    opt.textContent = `Boss Depth ${depth}`;
    bossSelect.appendChild(opt);
  });
  debugSection.appendChild(bossSelect);

  const spawnBossBtn = document.createElement("button");
  spawnBossBtn.textContent = "Start Boss (selected depth)";
  spawnBossBtn.style.marginLeft = "6px";
  spawnBossBtn.addEventListener("click", () => {
    const depth = parseInt(bossSelect.value, 10) || state.location.depth;
    controller.startCombat(true, depth);
    rerender();
  });
  debugSection.appendChild(spawnBossBtn);

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

  const spawnEntitiesButton = document.createElement("button");
  spawnEntitiesButton.textContent = "Spawn debug entities nearby";
  spawnEntitiesButton.addEventListener("click", () => {
    controller.debugSpawnEntitiesAround();
    rerender();
  });
  debugToggles.appendChild(spawnEntitiesButton);

  const lowHpButton = document.createElement("button");
  lowHpButton.textContent = "Set Party HP to 1";
  lowHpButton.addEventListener("click", () => {
    controller.debugSetPartyLowHealth();
    rerender();
  });
  debugToggles.appendChild(lowHpButton);

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
  
  if (new URLSearchParams(location.search).get("qa") === "1") infoPanel.appendChild(debugSection);

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
    activateDialog(overlay, modal, "Chest loot", () => { controller.clearChestLoot(); overlay.remove(); rerender(); });
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
    const choiceRow = document.createElement("div");
    choiceRow.className = "event-choice";
    const choiceButton = document.createElement("button");
    choiceButton.className = "event-choice-button";
    const number = document.createElement("span");
    number.className = "choice-number";
    number.textContent = String(index + 1);
    choiceButton.appendChild(number);
    const label = document.createElement("span");
    label.className = "choice-text";
    label.textContent = choice.label;
    choiceButton.appendChild(label);
    const blockedReason = getChoiceUnavailableReason(choice, state);
    choiceButton.disabled = !!blockedReason;
    if (blockedReason) choiceButton.title = blockedReason;
    choiceButton.addEventListener("click", () => {
      audioManager.playSfx("event_choice");
      controller.chooseEventChoice(choice.id);
      rerender();
    });
    choiceRow.appendChild(choiceButton);
    if (blockedReason) {
      const reason = document.createElement("span");
      reason.className = "choice-reason";
      reason.textContent = blockedReason;
      choiceRow.appendChild(reason);
    }
    choicesContainer.appendChild(choiceRow);
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

  const combatDepth = combatState.combatDepth ?? state.location.depth;
  let combatBackground = assetUrl("assets/backgrounds/battle/battle_bg1.webp");
  if (combatState.isBossFight) {
    const bossBg = assetUrl(`assets/backgrounds/bosses/BG_BOSS_D${combatDepth}.webp`);
    combatBackground = bossBg;
  }
  const backgroundImage = getCombatBackground(combatBackground);
  const compactCombat = window.innerWidth < 650;
  const combatLayoutWidth = Math.min(1600, Math.floor(window.innerWidth * 0.995));
  const canvasWidth = Math.min(combatLayoutWidth, Math.floor(window.innerWidth * 0.985));
  const canvasHeight = compactCombat
    ? Math.max(430, Math.min(560, Math.floor(window.innerHeight * 0.55)))
    : Math.max(300, Math.min(520, Math.floor(window.innerHeight * 0.41)));
  const controlsHeight = Math.min(400, Math.max(200, Math.floor(window.innerHeight * 0.28)));

  // Create combat container
  const combatContainer = document.createElement("div");
  combatContainer.className = "combat-container";
  combatContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    height: ${compactCombat ? "auto" : "100vh"};
    background: #05050a;
    align-items: center;
    padding: 12px 10px;
    box-sizing: border-box;
  `;
  root.appendChild(combatContainer);
  let effectsEnabled = !prefersReducedMotion();
  const effectToggle = document.createElement("button");
  effectToggle.type = "button";
  effectToggle.className = "combat-effects-toggle";
  effectToggle.textContent = `Effects: ${effectsEnabled ? "On" : "Off"}`;
  effectToggle.setAttribute("aria-pressed", String(effectsEnabled));
  effectToggle.addEventListener("click", () => {
    effectsEnabled = !effectsEnabled;
    effectToggle.textContent = `Effects: ${effectsEnabled ? "On" : "Off"}`;
    effectToggle.setAttribute("aria-pressed", String(effectsEnabled));
    if (!effectsEnabled) combatVisualCue = null;
    drawCombatFrame(performance.now());
  });
  combatContainer.appendChild(effectToggle);

  if (combatState.isBossFight) {
    const consequence = getStoryConsequence(state);
    if (consequence) {
      const feedback = document.createElement("p");
      feedback.className = "combat-story-feedback";
      feedback.textContent = consequence;
      combatContainer.appendChild(feedback);
    }
  }

  // Top section: Combat view
  const combatView = document.createElement("div");
  combatView.style.cssText = `
    flex: 1 1 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 6px 10px 10px;
    width: 100%;
  `;
  combatContainer.appendChild(combatView);

  // Combat canvas
  const combatCanvas = document.createElement("canvas");
  combatCanvas.setAttribute("aria-hidden", "true");
  combatCanvas.style.maxWidth = "100%";
  combatCanvas.style.boxShadow = "0 8px 24px rgba(0,0,0,0.45)";
  const combatStage = document.createElement("div");
  combatStage.className = "presence-stage";
  combatStage.appendChild(combatCanvas);
  combatView.appendChild(combatStage);
  presenceView = new PresenceView(presence, () => prefersReducedMotion() || !effectsEnabled, presenceHidden, true);
  presenceView.element.style.setProperty("--presence-combat-band", `${72 / canvasHeight * 100}%`);
  combatStage.appendChild(presenceView.element);
  const textSummary = document.createElement("section");
  textSummary.className = "combat-text-summary";
  textSummary.setAttribute("aria-label", "Combat status and enemy intentions");
  const roundHeading = document.createElement("h2");
  roundHeading.textContent = `Round ${combatState.turn} · ${combatState.phase}`;
  textSummary.appendChild(roundHeading);
  const enemiesText = document.createElement("p");
  enemiesText.textContent = "Enemies: " + combatState.encounter.enemies.map((enemy, index) => {
    const intent = combatState.enemyIntents?.[index];
    const ability = intent?.abilityId ? getAbility(intent.abilityId) : undefined;
    const target = ability?.targetType === "self" ? "self"
      : ability?.targetType === "all-enemies" ? "all party members"
      : combatState.party.members[intent?.targetIndex ?? -1]?.name ?? "unknown target";
    return `${enemy.name}: ${enemy.alive ? `${enemy.stats.hp}/${enemy.stats.maxHp} HP, ${enemy.statusEffects.join(", ") || "no status"}; plans ${ability?.name ?? "Attack"} on ${target}` : "defeated"}`;
  }).join("; ");
  textSummary.appendChild(enemiesText);
  const partyText = document.createElement("p");
  partyText.textContent = "Party: " + combatState.party.members.map((member) =>
    `${member.name}: ${member.alive ? `${member.stats.hp}/${member.stats.maxHp} HP, ${member.stats.sanity}/${member.stats.maxSanity} sanity, ${member.statusEffects.join(", ") || "no status"}` : "fallen"}`).join("; ");
  textSummary.appendChild(partyText);
  combatContainer.appendChild(textSummary);
  const drawCombatFrame = (now: number) => {
    const latestState = controller.getCombatState();
    if (!latestState) return;
    renderCombatUI(combatCanvas, latestState, {
      width: canvasWidth, height: canvasHeight,
      presenceBandPx: 72,
      backgroundImage: backgroundImage?.complete ? backgroundImage : undefined,
      nowMs: now, reducedMotion: prefersReducedMotion() || !effectsEnabled,
      visualCue: effectsEnabled ? combatVisualCue : null,
    });
  };
  drawCombatFrame(performance.now());
  animateCanvas(combatCanvas, drawCombatFrame);

  if (backgroundImage && !backgroundImage.complete) {
    backgroundImage.onload = () => {
      drawCombatFrame(performance.now());
    };
  }

  // Bottom section: Controls and log
  const controlsSection = document.createElement("div");
  controlsSection.className = "combat-controls-section";
  controlsSection.style.cssText = `
    display: flex;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    padding-inline: 4px;
  `;
  combatContainer.appendChild(controlsSection);

  const controlsWrapper = document.createElement("div");
  controlsWrapper.style.cssText = `
    display: grid;
    grid-template-columns: ${compactCombat ? "1fr" : "repeat(auto-fit, minmax(0, 1fr))"};
    gap: 20px;
    padding: 12px;
    width: ${Math.max(840, combatLayoutWidth)}px;
    max-width: 100%;
    box-sizing: border-box;
    justify-content: center;
    align-items: stretch;
    height: ${compactCombat ? "auto" : `${controlsHeight}px`};
  `;
  controlsSection.appendChild(controlsWrapper);

  // Combat log
  const logContainer = document.createElement("div");
  logContainer.style.cssText = `
    width: 100%;
    min-width: 0;
    height: ${compactCombat ? "160px" : "100%"};
    order: ${compactCombat ? 2 : 0};
  `;
  controlsWrapper.appendChild(logContainer);
  renderCombatLog(logContainer, combatState, 15);
  if (compactCombat) { logContainer.style.height = "160px"; logContainer.style.order = "2"; }

  // Action menu
  const actionContainer = document.createElement("div");
  actionContainer.style.cssText = `
    width: 100%;
    min-width: 0;
    height: ${compactCombat ? "auto" : "100%"};
    order: ${compactCombat ? 1 : 0};
  `;
  controlsWrapper.appendChild(actionContainer);

  const submitWithVisualCue = (action: CombatAction) => {
    const before = controller.getCombatState();
    if (!before || before.phase !== "select-action") return;
    const actor = getCurrentActor(before);
    if (!actor?.isPlayer || actor.index !== action.actorIndex) return;
    const actorId = before.party.members[action.actorIndex]?.id;
    if (!actorId) return;
    const hpBefore = before.party.members.map((member) => member.stats.hp);
    const enemyHpBefore = before.encounter.enemies.map((enemy) => enemy.stats.hp);
    controller.submitCombatAction(action);
    const after = controller.getCombatState();
    if (!after) return;
    combatVisualCue = {
      actorId,
      animation: action.type === "attack" ? "attack" : action.type === "defend" || action.type === "flee" ? "defend" : "cast",
      hitIds: after.party.members.filter((member, index) => member.stats.hp < hpBefore[index]).map((member) => member.id),
      partyHeals: after.party.members.flatMap((member, index) => member.stats.hp > hpBefore[index]
        ? [{ id: member.id, amount: member.stats.hp - hpBefore[index] }] : []),
      enemyHits: after.encounter.enemies.flatMap((enemy, index) => enemy.stats.hp < enemyHpBefore[index]
        ? [{ index, damage: enemyHpBefore[index] - enemy.stats.hp }] : []),
      enemyActorIndex: after.lastEnemyActedIndex,
      startedAt: performance.now(),
    };
    syncPresence(controller.getState());
    presence.play(action.type === "attack" ? "attack" : action.type === "defend" ? "brace"
      : action.type === "item" ? "use" : action.type === "flee" ? "brace" : "cast", combatVisualCue.startedAt, actorId);
  };

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

    if (action.type === "game-over") {
      controller.triggerGameOver();
      rerender();
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
      submitWithVisualCue(combatAction);
      rerender();
      return;
    }

    if (action.type === "flee") {
      const combatAction: CombatAction = {
        type: "flee",
        actorIndex: action.actorIndex,
        isPlayerAction: true,
      };
      submitWithVisualCue(combatAction);
      rerender();
      return;
    }
  };

  const renderActionMenu = () => {
    actionContainer.innerHTML = "";
    createActionMenu(actionContainer, combatState, handleAction);
    if (compactCombat) { actionContainer.style.height = "auto"; actionContainer.style.order = "1"; }
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
    activateDialog(overlay, panel, "Victory rewards", () => handleAction({ type: "end-combat" }));
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
    activateDialog(overlay, modal, title, closeCombatModal);
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
    submitWithVisualCue(combatAction);
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
      submitWithVisualCue(combatAction);
      selectedAbilityId = undefined;
    } else {
      const combatAction: CombatAction = {
        type: "attack",
        actorIndex: currentActor.index,
        targetIndex,
        isPlayerAction: true,
      };
      submitWithVisualCue(combatAction);
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

    const level = getCharacterLevel(character);
    const abilities = getCharacterAbilities(character.id).filter(
      (ability) => !ability.unlockLevel || level >= ability.unlockLevel
    );
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
        submitWithVisualCue(combatAction);
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
            submitWithVisualCue(combatAction);
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

function openPartyStatusModal(state: GameState, controller: GameController, rerender: () => void): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #111;
    border: 2px solid #444;
    padding: 16px;
    width: min(720px, 95vw);
    color: #e0e0e0;
    font-family: monospace;
  `;

  const title = document.createElement("h3");
  title.textContent = "Party Status";
  title.style.marginTop = "0";
  modal.appendChild(title);

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  list.style.gap = "10px";

  state.party.members.forEach((member) => {
    const card = document.createElement("div");
    card.style.cssText = `
      background: #191919;
      border: 1px solid #333;
      padding: 10px;
      border-radius: 8px;
    `;
    const name = document.createElement("div");
    name.textContent = member.name;
    name.style.fontWeight = "bold";
    card.appendChild(name);

    const hp = document.createElement("div");
    const san = document.createElement("div");
    const atk = document.createElement("div");
    const misc = document.createElement("div");
    const refreshStats = () => {
      const fresh = controller.getState().party.members.find((m) => m.id === member.id) || member;
      hp.textContent = `HP: ${fresh.stats.hp}/${fresh.stats.maxHp}`;
      san.textContent = `Sanity: ${fresh.stats.sanity}/${fresh.stats.maxSanity}`;
      atk.textContent = `ATK: ${fresh.stats.attack}  DEF: ${fresh.stats.defense}`;
      misc.textContent = `WILL: ${fresh.stats.will}  FOCUS: ${fresh.stats.focus}`;
      equipmentRows.forEach(({ slot, label, unequipBtn }) => {
        const currentId = fresh.equipment?.[slot];
        label.textContent = `${slot[0].toUpperCase() + slot.slice(1)}: ${
          currentId ? ITEMS[currentId]?.name || currentId : "Empty"
        }`;
        unequipBtn.disabled = !currentId;
      });
    };
    card.appendChild(hp);
    card.appendChild(san);
    card.appendChild(atk);
    card.appendChild(misc);

    const abilitiesBtn = document.createElement("button");
    abilitiesBtn.textContent = "View Abilities";
    abilitiesBtn.addEventListener("click", () => openAbilityListModal(member));
    card.appendChild(abilitiesBtn);

    const equipmentSection = document.createElement("div");
    equipmentSection.style.marginTop = "6px";
    equipmentSection.style.display = "flex";
    equipmentSection.style.flexDirection = "column";
    equipmentSection.style.gap = "4px";
    const slots: Array<{ slot: "weapon" | "armor" | "trinket"; label: HTMLSpanElement }> = [
      { slot: "weapon", label: document.createElement("span") },
      { slot: "armor", label: document.createElement("span") },
      { slot: "trinket", label: document.createElement("span") },
    ];
    const equipmentRows: Array<{
      slot: "weapon" | "armor" | "trinket";
      label: HTMLSpanElement;
      unequipBtn: HTMLButtonElement;
    }> = [];
    slots.forEach(({ slot, label }) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      const buttons = document.createElement("div");
      buttons.style.display = "flex";
      buttons.style.gap = "4px";
      const equipBtn = document.createElement("button");
      equipBtn.textContent = "Equip";
      equipBtn.addEventListener("click", () =>
        openEquipModal(member, slot, controller, rerender, overlay, refreshStats)
      );
      buttons.appendChild(equipBtn);
      const unequipBtn = document.createElement("button");
      unequipBtn.textContent = "Unequip";
      unequipBtn.addEventListener("click", () => {
        const fresh = controller.getState().party.members.find((m) => m.id === member.id);
        if (!fresh?.equipment?.[slot]) return;
        const idx = controller.getState().party.members.findIndex((m) => m.id === member.id);
        if (idx === -1) return;
        controller.unequipItem(idx, slot);
        refreshStats();
        rerender();
      });
      buttons.appendChild(unequipBtn);
      equipmentRows.push({ slot, label, unequipBtn });
      row.appendChild(label);
      row.appendChild(buttons);
      equipmentSection.appendChild(row);
    });
    card.appendChild(equipmentSection);

    list.appendChild(card);
    refreshStats();
  });

  modal.appendChild(list);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "12px";
  closeBtn.addEventListener("click", () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  activateDialog(overlay, modal, "Party status", () => overlay.remove());
}

function openAbilityListModal(member: GameState["party"]["members"][number]): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1300;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #111;
    border: 2px solid #444;
    padding: 14px;
    width: min(640px, 95vw);
    color: #e0e0e0;
    font-family: monospace;
  `;

  const title = document.createElement("h4");
  title.textContent = `${member.name} Abilities`;
  title.style.marginTop = "0";
  modal.appendChild(title);

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
  list.style.gap = "10px";

  const abilities = getCharacterAbilities(member.id).sort(
    (a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1)
  );
  const level = getCharacterLevel(member);

  abilities.forEach((ability) => {
    const unlocked = level >= (ability.unlockLevel ?? 1);
    const card = document.createElement("div");
    card.style.cssText = `
      background: ${unlocked ? "#191919" : "#161616"};
      border: 1px solid ${unlocked ? "#3a3a3a" : "#333"};
      padding: 10px;
      border-radius: 8px;
    `;
    const name = document.createElement("div");
    name.textContent = ability.name;
    name.style.fontWeight = "bold";
    card.appendChild(name);

    const desc = document.createElement("div");
    desc.textContent = ability.description;
    desc.style.fontSize = "12px";
    desc.style.color = "#b0b0b0";
    card.appendChild(desc);

    const status = document.createElement("div");
    status.style.marginTop = "6px";
    status.style.fontSize = "12px";
    status.style.color = unlocked ? "#7cff9f" : "#ff9f7c";
    status.textContent = unlocked
      ? "Unlocked"
      : `Locked - Reach level ${ability.unlockLevel ?? 1}`;
    card.appendChild(status);

    list.appendChild(card);
  });

  modal.appendChild(list);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "10px";
  closeBtn.addEventListener("click", () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  activateDialog(overlay, modal, `${member.name} abilities`, () => overlay.remove());
}

function openEquipModal(
  member: GameState["party"]["members"][number],
  slot: "weapon" | "armor" | "trinket",
  controller: GameController,
  rerender: () => void,
  _parentOverlay: HTMLDivElement,
  onEquip?: () => void
): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1350;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #111;
    border: 2px solid #444;
    padding: 14px;
    width: min(520px, 95vw);
    color: #e0e0e0;
    font-family: monospace;
  `;

  const title = document.createElement("h4");
  title.textContent = `Equip ${slot} for ${member.name}`;
  title.style.marginTop = "0";
  modal.appendChild(title);

  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "6px";

  const level = getCharacterLevel(member);

  const options = controller.getState().party.inventory.items.filter((entry) => {
    if (entry.item.type !== "equipment" || !entry.item.equipment) return false;
    if (entry.item.equipment.slot !== slot) return false;
    if (entry.item.equipment.allowedCharacters && !entry.item.equipment.allowedCharacters.includes(member.id)) {
      return false;
    }
    return true;
  });

  if (options.length === 0) {
    const none = document.createElement("p");
    none.textContent = "No compatible equipment available.";
    list.appendChild(none);
  } else {
    options.forEach((entry) => {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "2px";
      const reqLevel = entry.item.equipment?.requiredLevel ?? 1;
      const locked = level < reqLevel;
      const btn = document.createElement("button");
      btn.textContent = `${entry.item.name} (lvl ${reqLevel}+ )`;
      btn.disabled = locked;
      btn.style.opacity = locked ? "0.6" : "1";
      btn.style.cursor = locked ? "not-allowed" : "pointer";
      btn.addEventListener("click", () => {
        if (locked) return;
        const idx = controller.getState().party.members.findIndex((m) => m.id === member.id);
        if (idx === -1) return;
        controller.equipItem(idx, entry.item.id);
        overlay.remove();
        rerender();
        if (onEquip) onEquip();
      });
      const desc = document.createElement("div");
      const bonuses = entry.item.equipment?.statBonuses || {};
      const bonusText = Object.entries(bonuses)
        .filter(([, v]) => typeof v === "number" && v !== 0)
        .map(([k, v]) => `${k}+${v}`)
        .join(", ");
      const req = entry.item.equipment?.requiredLevel ?? 1;
      desc.textContent = `${entry.item.description}${bonusText ? ` | ${bonusText}` : ""} | Requires level ${req}`;
      desc.style.fontSize = "12px";
      desc.style.color = locked ? "#777" : "#b0b0b0";
      wrap.appendChild(btn);
      wrap.appendChild(desc);
      list.appendChild(wrap);
    });
  }

  modal.appendChild(list);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Cancel";
  closeBtn.style.marginTop = "10px";
  closeBtn.addEventListener("click", () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  activateDialog(overlay, modal, `Equip ${slot} for ${member.name}`, () => overlay.remove());
}

function openInventoryModal(state: GameState, controller: GameController, rerender: () => void): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #111;
    border: 2px solid #444;
    padding: 16px;
    width: min(760px, 95vw);
    color: #e0e0e0;
    font-family: monospace;
  `;

  const title = document.createElement("h3");
  title.textContent = "Inventory";
  title.style.marginTop = "0";
  modal.appendChild(title);

  const moneyRow = document.createElement("div");
  moneyRow.textContent = `Credits: ${state.party.inventory.money ?? 0}`;
  moneyRow.style.marginBottom = "8px";
  modal.appendChild(moneyRow);

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
  list.style.gap = "10px";

  const items = state.party.inventory.items;
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No items carried.";
    modal.appendChild(empty);
  } else {
    items.forEach((entry) => {
      const card = document.createElement("div");
      card.style.cssText = `
        background: #191919;
        border: 1px solid #333;
        padding: 10px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      `;
      const nameRow = document.createElement("div");
      nameRow.style.display = "flex";
      nameRow.style.justifyContent = "space-between";
      const name = document.createElement("span");
      name.textContent = entry.item.name;
      const qty = document.createElement("span");
      qty.textContent = `x${entry.quantity}`;
      nameRow.appendChild(name);
      nameRow.appendChild(qty);
      card.appendChild(nameRow);

      const desc = document.createElement("div");
      desc.textContent = entry.item.description;
      desc.style.fontSize = "12px";
      desc.style.color = "#b0b0b0";
      card.appendChild(desc);

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      const useBtn = document.createElement("button");
      useBtn.textContent = "Use";
      useBtn.disabled = state.mode !== "exploration" || !entry.item.usable;
      useBtn.addEventListener("click", () => {
        openInventoryUseModal(entry.item.id, state, controller, rerender, overlay);
      });
      actions.appendChild(useBtn);
      card.appendChild(actions);

      list.appendChild(card);
    });
    modal.appendChild(list);
  }

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "12px";
  closeBtn.addEventListener("click", () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  activateDialog(overlay, modal, "Inventory", () => overlay.remove());
}

function openInventoryUseModal(
  itemId: string,
  state: GameState,
  controller: GameController,
  rerender: () => void,
  parentOverlay: HTMLDivElement
): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1300;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #111;
    border: 2px solid #444;
    padding: 14px;
    width: 360px;
    color: #e0e0e0;
    font-family: monospace;
  `;

  const title = document.createElement("h4");
  title.textContent = `Use ${ITEMS[itemId]?.name ?? itemId}`;
  title.style.marginTop = "0";
  modal.appendChild(title);

  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "6px";

  state.party.members
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.alive)
    .forEach(({ m, idx }) => {
      const btn = document.createElement("button");
      btn.textContent = `${m.name} (HP ${m.stats.hp}/${m.stats.maxHp}, SAN ${m.stats.sanity}/${m.stats.maxSanity})`;
      const blockedReason = controller.getConsumableUnavailableReason(itemId, idx);
      btn.disabled = !!blockedReason;
      if (blockedReason) btn.title = blockedReason;
      btn.addEventListener("click", () => {
        const success = controller.useConsumableOutOfCombat(itemId, idx);
        overlay.remove();
        if (success) {
          parentOverlay.remove();
        }
        rerender();
      });
      list.appendChild(btn);
      if (blockedReason) {
        const reason = document.createElement("small");
        reason.textContent = blockedReason;
        list.appendChild(reason);
      }
    });

  modal.appendChild(list);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Cancel";
  closeBtn.style.marginTop = "10px";
  closeBtn.addEventListener("click", () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  activateDialog(overlay, modal, `Use ${ITEMS[itemId]?.name ?? itemId}`, () => overlay.remove());
}

export function initApp(root: HTMLElement): void {
  const controller = new GameController();
  setSoundSink((cue) => audioManager.playSfx(cue));
  const unavailableStorage: SaveStorage = {
    getItem: () => { throw new Error("Storage unavailable"); },
    setItem: () => { throw new Error("Storage unavailable"); },
    removeItem: () => { throw new Error("Storage unavailable"); },
  };
  let storage: SaveStorage;
  try { storage = window.localStorage; } catch { storage = unavailableStorage; }
  const repository = new SaveRepository(storage);
  let saveNotice: string | null = null;

  const saveRun = (): boolean => {
    if (controller.getState().mode === "title") return true;
    try {
      const error = repository.write(controller.snapshot());
      if (error) { saveNotice = error; return false; }
      return true;
    } catch {
      saveNotice = "Could not save this run.";
      return false;
    }
  };

  const saves: SaveActions = {
    read: () => repository.read(),
    notice: () => saveNotice,
    begin: () => {
      if (repository.read().kind !== "empty" && !window.confirm("Start a new run and replace the existing save? Export it first if you want a backup.")) return;
      try { repository.clear(); } catch { /* The player may still start without browser storage. */ }
      controller.newGame();
      controller.getState().mode = "exploration";
      currentDepthMusic = -1;
      render();
    },
    resume: () => {
      const result = repository.read();
      if (result.kind !== "ready") { saveNotice = "No valid run to continue."; render(); return; }
      controller.restore(result.snapshot);
      currentDepthMusic = -1;
      render();
    },
    save: () => {
      saveNotice = saveRun() ? "Run saved." : saveNotice;
      const status = root.querySelector<HTMLElement>(".save-status");
      if (status) status.textContent = saveNotice ?? "";
    },
    returnToTitle: () => {
      saveRun();
      controller.returnToTitle();
      resetTitleMusic();
      render();
    },
    export: () => {
      if (controller.getState().mode !== "title" && !saveRun()) { render(); return; }
      try {
        const raw = repository.exportRaw();
        if (!raw) { saveNotice = "No save is available for export."; render(); return; }
        const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "depths-of-the-fractured-mind-save.json";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch { saveNotice = "Could not export the save."; render(); }
    },
    import: async (file) => {
      if (repository.read().kind !== "empty" && !window.confirm("Replace the existing run with this imported save?")) return;
      try {
        const snapshot = repository.import(await file.text());
        controller.restore(snapshot);
        currentDepthMusic = -1;
        saveNotice = "Save imported.";
      } catch (error) {
        saveNotice = error instanceof Error ? error.message : "Could not import the save.";
      }
      render();
    },
    delete: () => {
      if (!window.confirm("Delete the saved run? Export it first if you want a backup.")) return;
      try { repository.clear(); saveNotice = "Save deleted."; }
      catch { saveNotice = "Could not delete the save."; }
      render();
    },
  };

  const commandQueue = new ExplorationCommandQueue();
  let qaPaused = false;
  let renderedMode: GameState["mode"] | null = null;
  let renderedDepth = -1;

  const render = (): void => {
    const preferences = readPreferences();
    document.documentElement.style.fontSize = `${preferences.textScale}%`;
    document.documentElement.dataset.motion = preferences.motion;
    const state = controller.getState();
    syncPresence(state);
    root.dataset.mode = state.mode;
    if (state.mode === "gameover" && renderedMode !== "gameover") {
      audioManager.stopMusic();
      audioManager.playSfx("defeat");
    }
    if (state.mode !== "title") saveRun();
    if (state.mode === "exploration" && renderedMode === "exploration" &&
        renderedDepth === state.location.depth && !state.chestLoot && dungeonRenderContext &&
        dungeonViewport?.quality === preferences.quality) {
      if (saveNotice && !root.querySelector(".save-status")) {
        const status = document.createElement("p");
        status.className = "save-status";
        status.textContent = saveNotice;
        status.setAttribute("role", "status");
        root.prepend(status);
      }
      refreshExploration(root, state, controller);
      return;
    }
    presenceView?.dispose(); presenceView = null;
    dungeonViewport?.dispose(); dungeonViewport = null; dungeonRenderContext = null;
    commandQueue.clear();
    root.replaceChildren();
    if (saveNotice && state.mode !== "title") {
      const status = document.createElement("p");
      status.className = "save-status";
      status.textContent = saveNotice;
      status.setAttribute("role", "status");
      root.appendChild(status);
    }

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
        renderTitle(root, controller, state, render, saves);
        break;
      case "exploration":
        renderExploration(root, controller, state, render, saves);
        break;
      case "event":
        renderEvent(root, controller, state, render);
        break;
      case "combat":
        renderCombat(root, controller, state, render);
        break;
      case "gameover":
        renderGameOver(root, state, saves);
        break;
      case "conversation":
        renderDialogue(root, controller, state, render);
        break;
      case "ending":
        renderEnding(root, controller, state, render, saves);
        break;
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
    renderedMode = state.mode;
    renderedDepth = state.location.depth;
    renderSettings(root, render);
  };

  const compatible = () => !qaPaused && controller.getState().mode === "exploration" && !document.querySelector('[role="dialog"]') && !root.querySelector(".settings-control[open]");
  const executeCommand = (command: ExplorationCommand) => {
    const before = { ...controller.getState().location };
    const beforeHp = controller.getState().party.members.find((member) => member.id === presence.selected)?.stats.hp ?? 0;
    const interactionId = command === "interact" ? controller.getInteraction()?.id : undefined;
    let interacted = false;
    if (command === "forward") controller.moveForward();
    else if (command === "backward") controller.moveBackward();
    else if (command === "left") controller.strafeLeft();
    else if (command === "right") controller.strafeRight();
    else if (command === "turnLeft") controller.turnLeft();
    else if (command === "turnRight") controller.turnRight();
    else if (command === "interact") interacted = controller.interact();
    else if (command === "talk") controller.startDialogue();
    const after = controller.getState();
    if (after.location.x !== before.x || after.location.y !== before.y) {
      partyMotionUntil = performance.now() + 420;
      partyMotionFacing = after.location.direction ?? "north";
    }
    render();
    if (after.mode === "exploration") {
      const now = performance.now();
      const afterHp = after.party.members.find((member) => member.id === presence.selected)?.stats.hp ?? 0;
      if (afterHp < beforeHp) presence.play("hurt", now);
      else if (interacted) presence.play(interactionId === "linen-shelf" ? "use"
        : interactionId === "intake-counter" || interactionId === "queue-shadow" ? "inspect" : "interact", now);
      else if (after.location.x !== before.x || after.location.y !== before.y) presence.play("walk", now);
      else if (after.location.direction !== before.direction) presence.play("turn", now, undefined, command === "turnLeft" ? -1 : 1);
    }
  };
  dispatchExploration = (command) => commandQueue.request(command, compatible(), dungeonViewport?.busy ?? true, executeCommand);
  flushExploration = () => commandQueue.flush(compatible(), dungeonViewport?.busy ?? true, executeCommand);
  cancelExploration = () => { commandQueue.clear(); presence.cancel(); };
  window.addEventListener("blur", () => { commandQueue.clear(); presence.cancel(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { commandQueue.clear(); presence.cancel(); } });
  // Read-only diagnostics remain available; mutation hooks require the explicit QA URL.
  Object.assign(window, { __DUNGEON_DIAGNOSTICS__: () => dungeonViewport?.diagnostics() ?? { backend: "inactive" } });
  Object.assign(window, { __PRESENCE_DIAGNOSTICS__: () => ({ ...presence.sample(performance.now(), prefersReducedMotion(), presenceHidden()),
    selected: presence.selected, lifecycle: { ...presenceLifecycle } }) });
  Object.defineProperty(window, "__THREE_GAME_DIAGNOSTICS__", { configurable: true, get: () => {
    const diagnostics = dungeonViewport?.diagnostics();
    if (!diagnostics || !("calls" in diagnostics)) return null;
    return { ...diagnostics, renderer: { calls: diagnostics.calls, triangles: diagnostics.triangles,
      geometries: diagnostics.geometries, textures: diagnostics.textures,
      materials: diagnostics.materials, pixelRatio: diagnostics.pixelRatio } };
  } });
  if (new URLSearchParams(location.search).get("qa") === "1") {
    let seed = 130013;
    Object.assign(window, { __THREE_GAME_TEST_HOOKS__: {
      seed: (value: number) => { if (!Number.isInteger(value)) throw new Error("QA seed must be an integer"); seed = value; },
      setState: async (name: string) => {
        const views: Record<string, { x: number; y: number; direction: "north" | "east" | "west" }> = {
          "opening-room": { x: 4, y: 15, direction: "north" },
          corridor: { x: 8, y: 14, direction: "east" },
          "door-occlusion": { x: 12, y: 7, direction: "north" },
          "door-open": { x: 12, y: 7, direction: "north" },
          "sprite-occlusion": { x: 12, y: 7, direction: "north" },
          "sprite-visible": { x: 12, y: 7, direction: "north" },
          "perception-clear": { x: 12, y: 12, direction: "north" },
          perception: { x: 12, y: 12, direction: "north" },
          interaction: { x: 4, y: 13, direction: "north" },
          npc: { x: 4, y: 15, direction: "west" },
          "evidence-bay": { x: 12, y: 4, direction: "north" },
        };
        const view = views[name];
        if (!view) throw new Error(`Unknown QA scene: ${name}`);
        qaPaused = false; commandQueue.clear();
        controller.newGame(seed);
        const state = controller.getState();
        state.mode = "exploration";
        state.location = { depth: 1, ...view };
        // Synthetic visibility fixtures isolate the actual depth-buffer test;
        // they are never a campaign state or a player progression shortcut.
        if (name === "sprite-occlusion" || name === "sprite-visible") state.depthMaps!.get(1)!.tiles[5][12].npcId = "keeper";
        if (name === "door-open" || name === "sprite-visible") {
          state.flags.intakePowerRestored = true;
          state.depthMaps!.get(1)!.tiles[6][12].locked = false;
        }
        if (name === "perception") state.flags.intakePerceptionSeen = true;
        renderedMode = null;
        render();
        await dungeonViewport?.ready;
        if (dungeonViewport?.diagnostics().backend !== "webgl2") throw new Error("QA requires the real WebGL2 viewport");
        return { state: name };
      },
      setPausedForScreenshot: (paused: boolean) => { qaPaused = paused; commandQueue.clear(); dungeonViewport?.setPaused(paused); presenceView?.freeze(paused ? performance.now() : null); },
      setPresence: (options: { id: CharacterId; action?: PresenceAction; elapsedMs?: number; wounded?: boolean; distressed?: boolean }) => {
        if (!["elias", "miriam", "subject13", "anya"].includes(options.id)) throw new Error("Unknown presentation identity");
        const actions: PresenceAction[] = ["idle", "walk", "turn", "interact", "inspect", "use", "attack", "cast", "brace", "hurt", "tension"];
        if (options.action && !actions.includes(options.action)) throw new Error("Unknown presentation action");
        if (options.elapsedMs !== undefined && (!Number.isFinite(options.elapsedMs) || options.elapsedMs < 0)) throw new Error("Invalid presentation time");
        const state = controller.getState();
        // Explicitly isolated scalar portrait/body-state fixture. No game stat or save is changed.
        const party = { ...state.party, members: state.party.members.map((member) => member.id === options.id
          ? { ...member, stats: { ...member.stats, hp: options.wounded ? Math.max(1, member.stats.maxHp * .25) : member.stats.hp,
            sanity: options.distressed ? member.stats.maxSanity * .25 : member.stats.sanity } } : member) };
        presence.sync({ ...state, party }, options.id); presence.select(options.id);
        for (const button of root.querySelectorAll<HTMLButtonElement>(".compact-party-member")) button.setAttribute("aria-pressed", String(button.dataset.character === options.id));
        const now = performance.now();
        if (options.action) presence.play(options.action, now - (options.elapsedMs ?? 0), options.id);
        presenceView?.freeze(now);
      },
      setReducedMotion: (reduced: boolean) => { updatePreferences({ motion: reduced ? "reduced" : "full" }); render(); },
      hideDebugUi: () => root.querySelectorAll<HTMLElement>(".debug-controls").forEach((element) => { element.hidden = true; element.style.display = "none"; }),
      resetMetrics: () => dungeonViewport?.resetMetrics(),
    } });
  }

  window.addEventListener("keydown", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const state = controller.getState();
    if (target?.closest("input, select, textarea, a, summary, [role='dialog'], [contenteditable='true']")) return;
    // Closing a modal restores its opener. Ordinary exploration buttons must
    // not trap WASD there; Enter/Space still retain their native button action.
    if (state.mode !== "exploration" && target?.closest("button")) return;
    if (state.mode === "exploration") {
      const bindings: Record<string, ExplorationCommand> = {
        w: "forward", ArrowUp: "forward", s: "backward", ArrowDown: "backward",
        a: "left", ArrowLeft: "left", d: "right", ArrowRight: "right",
        q: "turnLeft", e: "turnRight", f: "interact", t: "talk",
      };
      const command = bindings[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (command) { event.preventDefault(); dispatchExploration(command); }
    } else if (state.mode === "event" && state.currentEventId) {
      const eventData = getEventById(state.currentEventId);
      if (!eventData) return;
      const index = parseInt(event.key, 10);
      if (!Number.isNaN(index) && index >= 1 && index <= eventData.choices.length) {
        const choice = eventData.choices[index - 1];
        controller.chooseEventChoice(choice.id);
        render();
      }
    } else if (state.mode === "conversation" && state.currentDialogueId) {
      if (event.key === "Escape") { controller.leaveDialogue(); render(); return; }
      const dialogue = getDialogue(state.currentDialogueId);
      if (event.key === "Enter" && !dialogue?.choices?.length) { controller.advanceDialogue(); render(); return; }
      const index = Number.parseInt(event.key, 10);
      const choice = dialogue?.choices?.[index - 1];
      if (choice && !getDialogueChoiceUnavailableReason(choice, state)) {
        controller.chooseDialogueChoice(choice.id);
        render();
      }
    }
  });

  window.addEventListener("pagehide", saveRun);

  render();
}

function getCombatBackground(src: string): HTMLImageElement | undefined {
  if (combatBackgroundCache[src]) return combatBackgroundCache[src];
  const img = new Image();
  img.src = src;
  combatBackgroundCache[src] = img;
  return img;
}

function closeCombatModal(): void {
  if (combatActionModal) {
    combatActionModal.remove();
    combatActionModal = null;
  }
}
