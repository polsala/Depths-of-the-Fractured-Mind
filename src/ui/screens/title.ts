import type { GameController } from "../../game/index";
import type { GameState } from "../../game/state";
import { audioManager } from "../audio";
import type { SaveActions } from "./types";

let titleMusicStarted = false;
export function resetTitleMusic(): void { titleMusicStarted = false; }

export function renderTitle(
  root: HTMLElement,
  controller: GameController,
  _state: GameState,
  rerender: () => void,
  saves: SaveActions
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
    setTimeout(() => {
      // A late loading poll belongs to this title shell. Entering a game or
      // replacing the shell must not rerender/autosave an unrelated screen.
      if (titleContainer.isConnected && controller.getState().mode === "title") rerender();
    }, 250);
    return;
  }

  const button = document.createElement("button");
  button.className = "title-button";
  button.textContent = "Begin Your Descent";
  button.addEventListener("click", () => {
    audioManager.playSfx("ui_click");
    saves.begin();
  });
  menu.appendChild(button);

  const saved = saves.read();
  if (saved.kind === "ready") {
    const resume = document.createElement("button");
    resume.className = "title-button";
    resume.textContent = `Continue · Depth ${saved.snapshot.state.location.depth}`;
    resume.addEventListener("click", saves.resume);
    menu.appendChild(resume);
  } else if (saved.kind !== "empty") {
    const warning = document.createElement("p");
    warning.textContent = saved.message;
    warning.setAttribute("role", "alert");
    menu.appendChild(warning);
  }

  if (saved.kind !== "empty") {
    const exportButton = document.createElement("button");
    exportButton.className = "title-button";
    exportButton.textContent = "Export Save";
    exportButton.addEventListener("click", saves.export);
    menu.appendChild(exportButton);
    const deleteButton = document.createElement("button");
    deleteButton.className = "title-button";
    deleteButton.textContent = "Delete Save";
    deleteButton.addEventListener("click", saves.delete);
    menu.appendChild(deleteButton);
  }

  const importLabel = document.createElement("label");
  importLabel.className = "title-button";
  importLabel.textContent = "Import Save ";
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".json,application/json";
  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (file) void saves.import(file);
  });
  importLabel.appendChild(importInput);
  menu.appendChild(importLabel);

  const notice = saves.notice();
  if (notice) {
    const message = document.createElement("p");
    message.textContent = notice;
    message.setAttribute("role", "status");
    menu.appendChild(message);
  }

  // Atmospheric flavor text
  const flavorText = document.createElement("div");
  flavorText.className = "title-flavor";
  flavorText.innerHTML = `
    <p>The Engine beneath the abandoned Facility is still awake.</p>
    <p>Four people who once served it return to stop it—and face what they did.</p>
    <p>Follow the evidence, survive the five Depths, and decide what reaches daylight.</p>
  `;
  titleContainer.appendChild(flavorText);
}
