import { OBJECT_SPRITES } from "../../assets/manifest";
import { getDialogue, getDialogueChoiceUnavailableReason } from "../../game/dialogue";
import type { GameController } from "../../game/index";
import type { GameState } from "../../game/state";

export function renderDialogue(root: HTMLElement, controller: GameController, state: GameState, rerender: () => void): void {
  const dialogue = state.currentDialogueId ? getDialogue(state.currentDialogueId) : undefined;
  if (!dialogue) {
    controller.leaveDialogue();
    rerender();
    return;
  }

  const screen = document.createElement("section");
  screen.className = "dialogue-screen";
  screen.setAttribute("aria-label", "Conversation with the Keeper");
  root.appendChild(screen);
  const portrait = document.createElement("img");
  portrait.className = "dialogue-portrait";
  portrait.src = OBJECT_SPRITES.keeper;
  portrait.alt = "The Keeper, a scarred survivor holding a damaged radio";
  screen.appendChild(portrait);

  const content = document.createElement("div");
  content.className = "dialogue-content";
  screen.appendChild(content);
  const heading = document.createElement("h2");
  heading.textContent = "The Keeper";
  content.appendChild(heading);
  for (const line of dialogue.lines) {
    const paragraph = document.createElement("p");
    const speaker = document.createElement("strong");
    speaker.textContent = `${line.speaker === "keeper" ? "The Keeper" : line.speaker}: `;
    paragraph.appendChild(speaker);
    paragraph.append(line.text);
    content.appendChild(paragraph);
  }
  const actions = document.createElement("div");
  actions.className = "dialogue-actions";
  content.appendChild(actions);
  if (dialogue.choices?.length) {
    dialogue.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.textContent = `${index + 1}. ${choice.text}`;
      const reason = getDialogueChoiceUnavailableReason(choice, state);
      button.disabled = !!reason;
      if (reason) button.title = reason;
      button.addEventListener("click", () => {
        controller.chooseDialogueChoice(choice.id);
        rerender();
      });
      actions.appendChild(button);
      if (reason) {
        const hint = document.createElement("small");
        hint.textContent = reason;
        actions.appendChild(hint);
      }
    });
  } else {
    const next = document.createElement("button");
    next.textContent = "Continue";
    next.addEventListener("click", () => { controller.advanceDialogue(); rerender(); });
    actions.appendChild(next);
  }
  const leave = document.createElement("button");
  leave.textContent = "Leave conversation";
  leave.addEventListener("click", () => { controller.leaveDialogue(); rerender(); });
  actions.appendChild(leave);
}
