/**
 * Party UI - Character portraits and status display
 */

import type { PartyState, CharacterState } from "../game/state";
import { drawHeroPortrait, heroPortraitState, PORTRAIT_STATE_LABELS } from "../assets/hero-portraits";
import { getCharacterLevel, getCharacterExperience, getExpToNextLevel } from "../game/experience";

export interface PartyUIConfig {
  width: number;
  height: number;
  portraitSize: number;
  facing?: "north" | "south" | "east" | "west";
  timeMs?: number;
  reducedMotion?: boolean;
}

/** Draw the authored protagonist atlas, with health/sanity state overlays. */
function drawPortrait(
  ctx: CanvasRenderingContext2D, character: CharacterState,
  x: number, y: number, size: number, config: PartyUIConfig,
): void {
  ctx.fillStyle = "#1b2227";
  ctx.fillRect(x, y, size, size);
  // A portrait is a stable expression crop. Walking and facing belong to the
  // world body; health/sanity remain readable while movement is in progress.
  void config;
  const displayed = drawHeroPortrait(ctx, character, x, y, size);
  if (!displayed) {
    ctx.fillStyle = "#d6e3e7";
    ctx.font = `bold ${Math.floor(size * 0.45)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(character.name[0], x + size / 2, y + size / 2);
  }
  if (!character.alive || character.stats.hp < character.stats.maxHp * 0.3) {
    ctx.fillStyle = character.alive ? "rgba(98, 41, 34, 0.16)" : "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(x, y, size, size);
  } else if (character.stats.sanity < character.stats.maxSanity * 0.3) {
    ctx.fillStyle = "rgba(199, 193, 170, 0.1)";
    ctx.fillRect(x, y, size, size);
  }
  ctx.strokeStyle = character.alive ? "#758e97" : "#914949";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);
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

  if (canvas.width !== config.width) canvas.width = config.width;
  if (canvas.height !== config.height) canvas.height = config.height;

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
  const rowHeight = Math.max(portraitSize + spacing * 2, 84);
  const barWidth = config.width - portraitSize - spacing * 3;
  const barHeight = 16;

  members.forEach((character, index) => {
    const yOffset = index * rowHeight;

    drawPortrait(ctx, character, spacing, yOffset + spacing, portraitSize, config);

    // Character name
    ctx.fillStyle = character.alive ? "#ffffff" : "#666666";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      character.name,
      portraitSize + spacing * 2,
      yOffset + spacing,
      barWidth,
    );

    // HP bar
    const hpColor = character.stats.hp > character.stats.maxHp * 0.5
      ? "#7a423a"
      : character.stats.hp > character.stats.maxHp * 0.3
      ? "#785832"
      : "#8c3836";

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
      ? "#365b6a"
      : character.stats.sanity > character.stats.maxSanity * 0.3
      ? "#514d69"
      : "#6a4b65";

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

    // Level and experience (small text)
    const level = getCharacterLevel(character);
    const exp = getCharacterExperience(character);
    const expToNext = getExpToNextLevel(character);
    
    ctx.fillStyle = "#c7c1aa";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      `${PORTRAIT_STATE_LABELS[heroPortraitState(character)]} · Lvl ${level} · XP ${exp}/${expToNext}`,
      portraitSize + spacing * 2,
      yOffset + spacing + 60,
      barWidth,
    );
  });
}
