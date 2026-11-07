import { getEndingOptions, resolveEnding } from "../../game/endings";
import type { GameController } from "../../game/index";
import type { GameState } from "../../game/state";
import type { SaveActions } from "./types";

export function renderEnding(
  root: HTMLElement,
  controller: GameController,
  state: GameState,
  rerender: () => void,
  saves: SaveActions,
): void {
  const screen = document.createElement("section");
  screen.className = "ending-screen";
  root.appendChild(screen);
  const eyebrow = document.createElement("p");
  eyebrow.className = "ending-eyebrow";
  eyebrow.textContent = "DEPTH V · THE CORE";
  screen.appendChild(eyebrow);

  const result = resolveEnding(state);
  const heading = document.createElement("h1");
  heading.textContent = result?.title ?? "The Engine is silent. What remains?";
  screen.appendChild(heading);

  if (!result) {
    const introduction = document.createElement("p");
    introduction.textContent = "The Heart has fallen, but its last charge can still change the Facility. The party must decide what to carry out—and what to leave behind.";
    screen.appendChild(introduction);
    const options = document.createElement("div");
    options.className = "ending-options";
    screen.appendChild(options);
    for (const option of getEndingOptions(state)) {
      const card = document.createElement("div");
      card.className = "ending-option";
      const button = document.createElement("button");
      button.textContent = option.label;
      button.disabled = !!option.unavailableReason;
      if (option.unavailableReason) button.title = option.unavailableReason;
      button.addEventListener("click", () => {
        if (controller.chooseEnding(option.id)) rerender();
      });
      card.appendChild(button);
      const description = document.createElement("p");
      description.textContent = option.description;
      card.appendChild(description);
      if (option.unavailableReason) {
        const reason = document.createElement("small");
        reason.textContent = option.unavailableReason;
        card.appendChild(reason);
      }
      options.appendChild(card);
    }
  } else {
    for (const line of result.narrative) {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      screen.appendChild(paragraph);
    }
    const summary = document.createElement("section");
    summary.className = "ending-summary";
    const summaryHeading = document.createElement("h2");
    summaryHeading.textContent = "The lives and choices behind this ending";
    summary.appendChild(summaryHeading);
    const fate = document.createElement("p");
    fate.textContent = `Survivors: ${result.survivors.join(", ")}. ${state.party.members.filter((member) => !member.alive || member.stats.hp <= 0).map((member) => member.name).join(", ") || "No one"} lost in the descent.`;
    summary.appendChild(fate);
    const list = document.createElement("ul");
    for (const consequence of result.consequences) {
      const item = document.createElement("li");
      item.textContent = consequence;
      list.appendChild(item);
    }
    summary.appendChild(list);
    const moral = document.createElement("p");
    moral.textContent = `Mercy ${state.flags.moral.mercy} · Cruelty ${state.flags.moral.cruelty} · Truth ${state.flags.moral.truth} · Denial ${state.flags.moral.denial}`;
    summary.appendChild(moral);
    screen.appendChild(summary);
    const credits = document.createElement("details");
    const label = document.createElement("summary");
    label.textContent = "Credits and project";
    credits.appendChild(label);
    const link = document.createElement("a");
    link.href = "https://github.com/polsala/Depths-of-the-Fractured-Mind";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Depths of the Fractured Mind — source and acknowledgements";
    credits.appendChild(link);
    screen.appendChild(credits);
  }

  const actions = document.createElement("div");
  actions.className = "ending-actions";
  const replay = document.createElement("button");
  replay.textContent = "Begin New Run";
  replay.addEventListener("click", saves.begin);
  actions.appendChild(replay);
  const title = document.createElement("button");
  title.textContent = "Return to Title";
  title.addEventListener("click", saves.returnToTitle);
  actions.appendChild(title);
  screen.appendChild(actions);
}
