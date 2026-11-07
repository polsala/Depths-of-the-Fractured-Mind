import type { GameState } from "../../game/state";
import type { SaveActions } from "./types";

export function renderGameOver(
  root: HTMLElement,
  state: GameState,
  saves: SaveActions
): void {
  const container = document.createElement("div");
  container.className = "title-screen";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  root.appendChild(container);

  const panel = document.createElement("div");
  panel.style.cssText = `
    background: rgba(10,10,14,0.9);
    border: 2px solid #5a1a1a;
    padding: 24px;
    max-width: 640px;
    width: 90%;
    color: #e0e0e0;
    text-align: center;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  `;
  container.appendChild(panel);

  const title = document.createElement("h2");
  title.textContent = "Game Over";
  title.style.color = "#ff6b6b";
  title.style.marginTop = "0";
  panel.appendChild(title);

  const depthInfo = document.createElement("p");
  depthInfo.textContent = `The party fell on Depth ${state.location.depth}.`;
  depthInfo.style.marginBottom = "12px";
  panel.appendChild(depthInfo);

  const cause = document.createElement("p");
  cause.textContent = {
    trap: "A trap claimed the last surviving party member.",
    event: "A story choice claimed the last surviving party member.",
    combat: "The party was defeated in combat.",
    status: "A lingering condition claimed the last surviving party member.",
  }[state.gameOverCause ?? "combat"];
  panel.appendChild(cause);

  const hint = document.createElement("p");
  hint.textContent = "The corridors wait for another attempt. Regroup and descend once more.";
  hint.style.opacity = "0.85";
  panel.appendChild(hint);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "center";
  actions.style.gap = "10px";
  actions.style.marginTop = "16px";

  const titleBtn = document.createElement("button");
  titleBtn.textContent = "Return to Title";
  titleBtn.addEventListener("click", () => {
    saves.returnToTitle();
  });
  actions.appendChild(titleBtn);

  const retryBtn = document.createElement("button");
  retryBtn.textContent = "Begin New Run";
  retryBtn.addEventListener("click", () => {
    saves.begin();
  });
  actions.appendChild(retryBtn);

  panel.appendChild(actions);
}
