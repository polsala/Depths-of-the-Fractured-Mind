import { assetUrl } from "../../assets/manifest";
import { characterContract } from "../../assets/character-sprites";
import { createHeroPortrait } from "../../assets/hero-portraits";
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
  const keeperPresent = dialogue.lines.some((line) => line.speaker === "keeper");
  screen.setAttribute("aria-label", keeperPresent ? "Conversation with the Keeper" : "Party conversation");
  root.appendChild(screen);
  if (keeperPresent) {
    const portrait = document.createElement("img");
    portrait.className = "dialogue-portrait";
    portrait.src = assetUrl(`assets/sprites/characters/${characterContract.characters.keeper.idle}`);
    portrait.alt = "The Keeper, white-haired and severe, holding a brass claim tag and green ledger";
    screen.appendChild(portrait);
  } else {
    const firstSpeaker = state.party.members.find((member) => dialogue.lines.some((line) => line.speaker === member.id));
    if (firstSpeaker) {
      const portrait = createHeroPortrait(firstSpeaker, 128);
      portrait.classList.add("dialogue-focus-portrait");
      screen.appendChild(portrait);
    } else screen.classList.add("dialogue-screen-text-only");
  }

  const content = document.createElement("div");
  content.className = "dialogue-content";
  screen.appendChild(content);
  const heading = document.createElement("h2");
  heading.textContent = keeperPresent ? "The Keeper" : "The party";
  content.appendChild(heading);
  for (const line of dialogue.lines) {
    const paragraph = document.createElement("p");
    const speaker = document.createElement("strong");
    const member = state.party.members.find((entry) => entry.id === line.speaker);
    speaker.textContent = `${line.speaker === "keeper" ? "The Keeper" : member?.name ?? (line.speaker === "narrator" ? "Narrator" : "Unknown")}: `;
    paragraph.appendChild(speaker);
    paragraph.append(line.text);
    if (member) {
      const row = document.createElement("div");
      row.className = "dialogue-line";
      const portrait = createHeroPortrait(member);
      row.append(portrait, paragraph);
      content.appendChild(row);
    } else content.appendChild(paragraph);
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
