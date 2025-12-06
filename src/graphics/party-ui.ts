/**
 * Party UI - Character portraits and status display
 */

import type { PartyState, CharacterState } from "../game/state";

export interface PartyUIConfig {
  width: number;
  height: number;
  portraitSize: number;
}

/**
 * Generate a simple character portrait using Canvas API
 * Creates distinctive visual representations for each character
 */
function generatePortrait(
  ctx: CanvasRenderingContext2D,
  character: CharacterState,
  size: number
): void {
  const x = 0;
  const y = 0;

  // Background based on character
  const backgrounds: Record<string, string> = {
    elias: "#3d4e5c", // Cold blue-gray
    miriam: "#5c3d4e", // Deep purple
    subject13: "#4e5c3d", // Muted green
    anya: "#5c4e3d", // Warm brown
  };

  const bg = backgrounds[character.id] || "#3d3d3d";

  // Draw background
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, size, size);

  // Add border
  ctx.strokeStyle = character.alive ? "#8b9da9" : "#4a3333";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, size, size);

  // Character initial
  ctx.fillStyle = character.alive ? "#ffffff" : "#666666";
  ctx.font = `bold ${size * 0.5}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(character.name.charAt(0).toUpperCase(), x + size / 2, y + size / 2);

  // Status indicator
  if (!character.alive) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#ff4444";
    ctx.font = `${size * 0.25}px sans-serif`;
    ctx.fillText("DEAD", x + size / 2, y + size / 2);
  } else if (character.stats.hp < character.stats.maxHp * 0.3) {
    // Low HP indicator
    ctx.fillStyle = "rgba(255, 68, 68, 0.3)";
    ctx.fillRect(x, y, size, size);
  } else if (character.stats.sanity < character.stats.maxSanity * 0.3) {
    // Low sanity indicator
    ctx.fillStyle = "rgba(138, 68, 255, 0.3)";
    ctx.fillRect(x, y, size, size);
  }
}

/**
 * Draw a stat bar (HP or Sanity)
 */
function drawStatBar(
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
  const percentage = Math.max(0, Math.min(1, current / max));

  // Background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x, y, width, height);

  // Border
  ctx.strokeStyle = "#4a4a4a";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Fill
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, (width - 2) * percentage, height - 2);

  // Label
  ctx.fillStyle = "#ffffff";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${label}: ${current}/${max}`, x + 2, y + 2);
}

/**
 * Render the party UI panel
 */
export function renderPartyUI(
  canvas: HTMLCanvasElement,
  party: PartyState,
  config: PartyUIConfig
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = config.width;
  canvas.height = config.height;

  // Clear canvas
  ctx.clearRect(0, 0, config.width, config.height);

  // Background
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, config.width, config.height);

  // Border
  ctx.strokeStyle = "#3d3d3d";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, config.width, config.height);

  const members = party.members;
  const spacing = 10;
  const portraitSize = config.portraitSize;
  const barWidth = config.width - portraitSize - spacing * 3;
  const barHeight = 16;

  members.forEach((character, index) => {
    const yOffset = index * (portraitSize + spacing * 2);

    // Create temporary canvas for portrait
    const portraitCanvas = document.createElement("canvas");
    portraitCanvas.width = portraitSize;
    portraitCanvas.height = portraitSize;
    const portraitCtx = portraitCanvas.getContext("2d");
    if (portraitCtx) {
      generatePortrait(portraitCtx, character, portraitSize);
      ctx.drawImage(portraitCanvas, spacing, yOffset + spacing);
    }

    // Character name
    ctx.fillStyle = character.alive ? "#ffffff" : "#666666";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      character.name,
      portraitSize + spacing * 2,
      yOffset + spacing
    );

    // HP bar
    const hpColor = character.stats.hp > character.stats.maxHp * 0.5
      ? "#44ff44"
      : character.stats.hp > character.stats.maxHp * 0.3
      ? "#ffaa44"
      : "#ff4444";

    drawStatBar(
      ctx,
      portraitSize + spacing * 2,
      yOffset + spacing + 20,
      barWidth,
      barHeight,
      character.stats.hp,
      character.stats.maxHp,
      hpColor,
      "HP"
    );

    // Sanity bar
    const sanityColor = character.stats.sanity > character.stats.maxSanity * 0.5
      ? "#4488ff"
      : character.stats.sanity > character.stats.maxSanity * 0.3
      ? "#aa44ff"
      : "#ff44aa";

    drawStatBar(
      ctx,
      portraitSize + spacing * 2,
      yOffset + spacing + 40,
      barWidth,
      barHeight,
      character.stats.sanity,
      character.stats.maxSanity,
      sanityColor,
      "SAN"
    );
  });
}
