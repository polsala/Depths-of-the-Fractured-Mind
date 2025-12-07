import type { CombatState } from "../game/combat/state";
import { getAlivePartyMembers, getAliveEnemies, getCurrentActor } from "../game/combat/state";
import { getCharacterAbilities, canUseAbility } from "../game/abilities";

export interface CombatUIOptions {
  width: number;
  height: number;
  backgroundImage?: HTMLImageElement;
}

const COLORS = {
  background: "#1a1a1a",
  panel: "rgba(26, 26, 26, 0.55)",
  border: "#4a4a4a",
  text: "#e0e0e0",
  textDim: "#888888",
  hp: "#cc3333",
  hpLow: "#ff6666",
  sanity: "#3366cc",
  sanityLow: "#6699ff",
  selected: "#ffcc00",
  enemy: "#cc6666",
  ally: "#66cc66",
};

export function renderCombatUI(
  canvas: HTMLCanvasElement,
  state: CombatState,
  options: CombatUIOptions
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = options.width;
  canvas.height = options.height;

  // Background image or fallback fill
  if (options.backgroundImage && options.backgroundImage.complete && options.backgroundImage.naturalWidth > 0) {
    drawCoverImage(ctx, options.backgroundImage, canvas.width, canvas.height);
    // Darken slightly for UI readability
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Render in sections
  const topHeight = Math.floor(options.height * 0.5);
  const bottomHeight = options.height - topHeight;

  // Top: Enemies
  renderEnemies(ctx, state, 0, 0, options.width, topHeight);

  // Bottom: Party
  renderParty(ctx, state, 0, topHeight, options.width, bottomHeight);
}

function renderEnemies(
  ctx: CanvasRenderingContext2D,
  state: CombatState,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, width, height);

  const aliveEnemies = getAliveEnemies(state.encounter);
  if (aliveEnemies.length === 0) return;

  const enemyWidth = Math.min(120, Math.floor(width / aliveEnemies.length) - 10);
  const startX = Math.floor((width - enemyWidth * aliveEnemies.length) / 2);

  aliveEnemies.forEach((enemy, index) => {
    const enemyX = startX + index * (enemyWidth + 10);
    const enemyY = y + 20;

    // Enemy box
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(enemyX, enemyY, enemyWidth, height - 40);

    // Enemy name
    ctx.fillStyle = COLORS.enemy;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(enemy.name, enemyX + enemyWidth / 2, enemyY + 20);

    // HP bar
    const hpBarY = enemyY + 35;
    renderBar(
      ctx,
      enemyX + 10,
      hpBarY,
      enemyWidth - 20,
      12,
      enemy.stats.hp,
      enemy.stats.maxHp,
      COLORS.hp,
      "HP"
    );

    // SAN bar (if enemy has sanity)
    if (enemy.stats.maxSanity > 0) {
      const sanBarY = hpBarY + 20;
      renderBar(
        ctx,
        enemyX + 10,
        sanBarY,
        enemyWidth - 20,
        12,
        enemy.stats.sanity,
        enemy.stats.maxSanity,
        COLORS.sanity,
        "SAN"
      );
    }

    // Status effects
    if (enemy.statusEffects.length > 0) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      const statusY = hpBarY + (enemy.stats.maxSanity > 0 ? 40 : 20);
      ctx.fillText(
        enemy.statusEffects.join(", "),
        enemyX + enemyWidth / 2,
        statusY
      );
    }
  });
}

function renderParty(
  ctx: CanvasRenderingContext2D,
  state: CombatState,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, width, height);

  const aliveParty = getAlivePartyMembers(state.party);
  if (aliveParty.length === 0) return;

  const memberWidth = Math.floor(width / 4) - 5;

  state.party.members.forEach((member, index) => {
    if (!member.alive) return;

    const memberX = x + index * (memberWidth + 5);
    const memberY = y + 10;

    // Highlight current actor if it's their turn
    const currentActor = getCurrentActor(state);
    if (state.phase === "select-action" && currentActor?.isPlayer && index === currentActor.index) {
      ctx.strokeStyle = COLORS.selected;
      ctx.lineWidth = 3;
      ctx.strokeRect(memberX - 2, memberY - 2, memberWidth + 4, height - 16);
    }

    // Member box
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(memberX, memberY, memberWidth, height - 20);

    // Member name
    ctx.fillStyle = COLORS.ally;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(member.name.substring(0, 15), memberX + 5, memberY + 15);

    // HP bar
    renderBar(
      ctx,
      memberX + 5,
      memberY + 25,
      memberWidth - 10,
      10,
      member.stats.hp,
      member.stats.maxHp,
      member.stats.hp < member.stats.maxHp * 0.3 ? COLORS.hpLow : COLORS.hp,
      "HP"
    );

    // SAN bar
    renderBar(
      ctx,
      memberX + 5,
      memberY + 42,
      memberWidth - 10,
      10,
      member.stats.sanity,
      member.stats.maxSanity,
      member.stats.sanity < member.stats.maxSanity * 0.3
        ? COLORS.sanityLow
        : COLORS.sanity,
      "SAN"
    );

    // Stats
    ctx.fillStyle = COLORS.textDim;
    ctx.font = "9px monospace";
    ctx.fillText(`ATK ${member.stats.attack}`, memberX + 5, memberY + 62);
    ctx.fillText(`DEF ${member.stats.defense}`, memberX + 5, memberY + 72);
    ctx.fillText(`WILL ${member.stats.will}`, memberX + 5, memberY + 82);

    // Status effects
    if (member.statusEffects.length > 0) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = "8px monospace";
      const statusText = member.statusEffects.join(", ");
      ctx.fillText(
        statusText.substring(0, 12),
        memberX + 5,
        memberY + 95
      );
    }
  });
}

function renderBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  current: number,
  max: number,
  color: string,
  label: string
): void {
  // Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, width, height);

  // Fill
  const fillWidth = Math.max(0, (current / max) * width);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, fillWidth, height);

  // Border
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Text
  ctx.fillStyle = COLORS.text;
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${label} ${current}/${max}`, x + width / 2, y + height - 2);
}

export function renderCombatLog(
  container: HTMLElement,
  state: CombatState,
  maxEntries: number = 10
): void {
  container.innerHTML = "";
  container.style.cssText = `
    background: ${COLORS.panel};
    border: 2px solid ${COLORS.border};
    padding: 10px;
    max-height: 200px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 12px;
    color: ${COLORS.text};
  `;

  const recentLogs = state.log.slice(-maxEntries);
  recentLogs.forEach((entry) => {
    const logEntry = document.createElement("div");
    logEntry.textContent = entry.message;
    logEntry.style.marginBottom = "4px";

    // Color code by type
    switch (entry.type) {
      case "damage":
        logEntry.style.color = COLORS.hp;
        break;
      case "heal":
        logEntry.style.color = COLORS.ally;
        break;
      case "sanity":
        logEntry.style.color = COLORS.sanity;
        break;
      case "status":
        logEntry.style.color = COLORS.selected;
        break;
      case "dialogue":
        logEntry.style.color = "#ffaa00";
        logEntry.style.fontStyle = "italic";
        logEntry.style.marginTop = "8px";
        logEntry.style.marginBottom = "8px";
        break;
      case "system":
        logEntry.style.color = COLORS.text;
        logEntry.style.fontWeight = "bold";
        break;
    }

    container.appendChild(logEntry);
  });

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

export function createActionMenu(
  container: HTMLElement,
  state: CombatState,
  onAction: (action: any) => void
): void {
  container.innerHTML = "";
  container.style.cssText = `
    background: ${COLORS.panel};
    border: 2px solid ${COLORS.border};
    padding: 15px;
    font-family: monospace;
  `;

  if (state.phase !== "select-action") {
    const statusText = document.createElement("div");
    statusText.style.color = COLORS.text;
    
    if (state.phase === "execute-action") {
      statusText.textContent = "Action executing...";
    } else if (state.phase === "victory") {
      statusText.textContent = "Victory!";
      const continueBtn = createButton("Continue", () => onAction({ type: "end-combat" }));
      container.appendChild(statusText);
      container.appendChild(continueBtn);
      return;
    } else if (state.phase === "defeat") {
      statusText.textContent = "Defeat...";
      const retryBtn = createButton("Retry", () => onAction({ type: "retry" }));
      container.appendChild(statusText);
      container.appendChild(retryBtn);
      return;
    } else if (state.phase === "fled") {
      statusText.textContent = "Fled from battle!";
      const continueBtn = createButton("Continue", () => onAction({ type: "end-combat" }));
      container.appendChild(statusText);
      container.appendChild(continueBtn);
      return;
    }
    
    container.appendChild(statusText);
    return;
  }

  // Get current actor
  const currentActor = getCurrentActor(state);
  if (!currentActor || !currentActor.isPlayer) {
    const statusText = document.createElement("div");
    statusText.style.color = COLORS.text;
    statusText.textContent = "Enemy turn...";
    container.appendChild(statusText);
    return;
  }
  
  const character = state.party.members[currentActor.index];
  if (!character || !character.alive) return;

  const title = document.createElement("div");
  title.textContent = `${character.name}'s Turn`;
  title.style.cssText = `
    color: ${COLORS.selected};
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 14px;
  `;
  container.appendChild(title);

  // Main actions
  const actionsDiv = document.createElement("div");
  actionsDiv.style.marginBottom = "10px";

  const attackBtn = createButton("Attack", () => {
    onAction({ type: "select-target", actionType: "attack" });
  });
  actionsDiv.appendChild(attackBtn);

  const abilityBtn = createButton("Abilities", () => {
    onAction({ type: "show-abilities" });
  });
  actionsDiv.appendChild(abilityBtn);

  const itemBtn = createButton("Items", () => {
    onAction({ type: "show-items" });
  });
  actionsDiv.appendChild(itemBtn);

  const actorInfo = getCurrentActor(state);
  if (!actorInfo || !actorInfo.isPlayer) return; // Safety check
  
  const defendBtn = createButton("Defend", () => {
    onAction({
      type: "defend",
      actorIndex: actorInfo.index,
    });
  });
  actionsDiv.appendChild(defendBtn);

  const fleeBtn = createButton("Flee", () => {
    onAction({
      type: "flee",
      actorIndex: actorInfo.index,
    });
  });
  if (!state.isBossFight) {
    actionsDiv.appendChild(fleeBtn);
  }

  container.appendChild(actionsDiv);
}

export function createAbilityMenu(
  container: HTMLElement,
  state: CombatState,
  onAbility: (abilityId: string) => void,
  onBack: () => void
): void {
  container.innerHTML = "";

  const actorInfo = getCurrentActor(state);
  if (!actorInfo || !actorInfo.isPlayer) return;
  
  const character = state.party.members[actorInfo.index];
  if (!character) return;

  const title = document.createElement("div");
  title.textContent = `${character.name}'s Abilities`;
  title.style.cssText = `
    color: ${COLORS.selected};
    font-weight: bold;
    margin-bottom: 10px;
  `;
  container.appendChild(title);

  const abilities = getCharacterAbilities(character.id);
  abilities.forEach((ability) => {
    const canUse = canUseAbility(ability, character);
    const btn = createButton(
      `${ability.name} ${ability.cost.sanity ? `(${ability.cost.sanity} SAN)` : ""}`,
      canUse ? () => onAbility(ability.id) : undefined,
      !canUse
    );
    
    const abilityContainer = document.createElement("div");
    abilityContainer.style.marginBottom = "5px";
    abilityContainer.appendChild(btn);
    
    const desc = document.createElement("div");
    desc.textContent = ability.description;
    desc.style.cssText = `
      font-size: 10px;
      color: ${COLORS.textDim};
      margin-left: 10px;
      margin-bottom: 5px;
    `;
    abilityContainer.appendChild(desc);
    
    container.appendChild(abilityContainer);
  });

  const backBtn = createButton("Back", onBack);
  backBtn.style.marginTop = "10px";
  container.appendChild(backBtn);
}

export function createTargetSelector(
  container: HTMLElement,
  state: CombatState,
  isAllyTarget: boolean,
  onTarget: (index: number) => void,
  onBack: () => void
): void {
  container.innerHTML = "";

  const title = document.createElement("div");
  title.textContent = isAllyTarget ? "Select Ally" : "Select Enemy";
  title.style.cssText = `
    color: ${COLORS.selected};
    font-weight: bold;
    margin-bottom: 10px;
  `;
  container.appendChild(title);

  if (isAllyTarget) {
    state.party.members.forEach((member, index) => {
      if (!member.alive) return;
      
      const btn = createButton(
        `${member.name} (HP: ${member.stats.hp}/${member.stats.maxHp})`,
        () => onTarget(index)
      );
      container.appendChild(btn);
    });
  } else {
    state.encounter.enemies.forEach((enemy, index) => {
      if (!enemy.alive) return;
      
      const btn = createButton(
        `${enemy.name} (HP: ${enemy.stats.hp}/${enemy.stats.maxHp})`,
        () => onTarget(index)
      );
      container.appendChild(btn);
    });
  }

  const backBtn = createButton("Back", onBack);
  backBtn.style.marginTop = "10px";
  container.appendChild(backBtn);
}

function createButton(
  text: string,
  onClick?: () => void,
  disabled: boolean = false
): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = text;
  button.disabled = disabled;
  button.style.cssText = `
    background: ${disabled ? COLORS.border : COLORS.panel};
    color: ${disabled ? COLORS.textDim : COLORS.text};
    border: 2px solid ${COLORS.border};
    padding: 8px 12px;
    margin: 5px;
    cursor: ${disabled ? "not-allowed" : "pointer"};
    font-family: monospace;
    font-size: 12px;
  `;

  if (!disabled && onClick) {
    button.addEventListener("click", onClick);
    button.addEventListener("mouseenter", () => {
      button.style.background = COLORS.selected;
      button.style.color = COLORS.background;
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = COLORS.panel;
      button.style.color = COLORS.text;
    });
  }

  return button;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  const imgRatio = image.width / image.height;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > canvasRatio) {
    // Image is wider than canvas ratio
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgRatio;
    offsetX = (canvasWidth - drawWidth) / 2;
  } else {
    // Image is taller than canvas ratio
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    offsetY = (canvasHeight - drawHeight) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}
