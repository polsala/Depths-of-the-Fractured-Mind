/**
 * Party UI - Character portraits and status display
 */

import type { PartyState, CharacterState } from "../game/state";
import { getCharacterLevel, getCharacterExperience, getExpToNextLevel } from "../game/experience";

export interface PartyUIConfig {
  width: number;
  height: number;
  portraitSize: number;
}

// Cache for portrait canvases to avoid recreating them on every render
const portraitCache = new Map<string, HTMLCanvasElement>();

/**
 * Generate detailed pixel art character portrait
 * Creates distinctive visual representations for each character
 */
function generatePortrait(
  character: CharacterState,
  size: number
): HTMLCanvasElement {
  // Check cache first - use separator to avoid collisions
  const cacheKey = `${character.id}|${size}|${character.alive}|${character.stats.hp}|${character.stats.maxHp}|${character.stats.sanity}|${character.stats.maxSanity}`;
  
  const cached = portraitCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Create new portrait canvas
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering

  // Character-specific colors and features
  const characterData: Record<string, { bg: string; skin: string; hair: string; eyes: string; clothing: string }> = {
    elias: {
      bg: "#2a3540",
      skin: "#d4a574",
      hair: "#4a3020",
      eyes: "#6b8ca3",
      clothing: "#3d4e5c"
    },
    miriam: {
      bg: "#3d2a40",
      skin: "#c9a885",
      hair: "#2a1520",
      eyes: "#8b6f9e",
      clothing: "#5c3d4e"
    },
    subject13: {
      bg: "#2a402a",
      skin: "#a8b8a0",
      hair: "#3d4e3d",
      eyes: "#7d9e6f",
      clothing: "#4e5c3d"
    },
    anya: {
      bg: "#403d2a",
      skin: "#d4b894",
      hair: "#2a2015",
      eyes: "#6f5d4e",
      clothing: "#5c4e3d"
    }
  };

  const data = characterData[character.id] || characterData.elias;

  // Background
  ctx.fillStyle = data.bg;
  ctx.fillRect(0, 0, size, size);

  // Draw pixel art portrait
  const pixelSize = Math.max(2, Math.floor(size / 32));
  
  // Head/face outline
  ctx.fillStyle = data.skin;
  const faceWidth = 18 * pixelSize;
  const faceHeight = 22 * pixelSize;
  const faceX = (size - faceWidth) / 2;
  const faceY = size * 0.25;
  
  // Draw head shape
  ctx.fillRect(faceX + 4 * pixelSize, faceY, faceWidth - 8 * pixelSize, faceHeight);
  ctx.fillRect(faceX + 2 * pixelSize, faceY + 2 * pixelSize, faceWidth - 4 * pixelSize, faceHeight - 4 * pixelSize);
  ctx.fillRect(faceX, faceY + 4 * pixelSize, faceWidth, faceHeight - 8 * pixelSize);

  // Hair
  ctx.fillStyle = data.hair;
  ctx.fillRect(faceX, faceY, faceWidth, 10 * pixelSize);
  ctx.fillRect(faceX - 2 * pixelSize, faceY + 4 * pixelSize, 4 * pixelSize, 8 * pixelSize);
  ctx.fillRect(faceX + faceWidth - 2 * pixelSize, faceY + 4 * pixelSize, 4 * pixelSize, 8 * pixelSize);

  // Eyes
  ctx.fillStyle = data.eyes;
  ctx.fillRect(faceX + 5 * pixelSize, faceY + 10 * pixelSize, 3 * pixelSize, 3 * pixelSize);
  ctx.fillRect(faceX + faceWidth - 8 * pixelSize, faceY + 10 * pixelSize, 3 * pixelSize, 3 * pixelSize);

  // Eye highlights
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(faceX + 6 * pixelSize, faceY + 11 * pixelSize, pixelSize, pixelSize);
  ctx.fillRect(faceX + faceWidth - 7 * pixelSize, faceY + 11 * pixelSize, pixelSize, pixelSize);

  // Nose
  ctx.fillStyle = "#a08060";
  ctx.fillRect(faceX + faceWidth / 2 - pixelSize, faceY + 14 * pixelSize, 2 * pixelSize, 3 * pixelSize);

  // Mouth
  ctx.fillStyle = "#604040";
  ctx.fillRect(faceX + faceWidth / 2 - 2 * pixelSize, faceY + 18 * pixelSize, 4 * pixelSize, pixelSize);

  // Shoulders/clothing
  ctx.fillStyle = data.clothing;
  const shoulderY = faceY + faceHeight;
  ctx.fillRect(faceX - 4 * pixelSize, shoulderY, faceWidth + 8 * pixelSize, size - shoulderY);

  // Add border frame
  ctx.strokeStyle = character.alive ? "#8b9da9" : "#4a3333";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, size, size);

  // Inner decorative frame
  ctx.strokeStyle = character.alive ? "#6d7d89" : "#3a2323";
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // Status overlays
  if (!character.alive) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, size, size);
    
    // Skull icon for death
    ctx.fillStyle = "#ff4444";
    ctx.font = `${size * 0.4}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("☠", size / 2, size / 2);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = `${size * 0.15}px sans-serif`;
    ctx.fillText("DEAD", size / 2, size * 0.75);
  } else if (character.stats.hp < character.stats.maxHp * 0.3) {
    // Low HP indicator
    ctx.fillStyle = "rgba(255, 68, 68, 0.3)";
    ctx.fillRect(0, 0, size, size);
    
    // Damage marks
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.2);
    ctx.lineTo(size * 0.3, size * 0.3);
    ctx.moveTo(size * 0.7, size * 0.25);
    ctx.lineTo(size * 0.8, size * 0.35);
    ctx.stroke();
  } else if (character.stats.sanity < character.stats.maxSanity * 0.3) {
    // Low sanity indicator - distortion effect
    ctx.fillStyle = "rgba(138, 68, 255, 0.3)";
    ctx.fillRect(0, 0, size, size);
    
    // Add glitch effect
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(138, 68, 255, ${0.5 - i * 0.15})`;
      ctx.lineWidth = 1;
      const y = size * (0.3 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  }

  // Cache the portrait
  portraitCache.set(cacheKey, canvas);

  // Limit cache size to prevent memory leaks - remove oldest entries
  if (portraitCache.size > 50) {
    const entriesToRemove = portraitCache.size - 40; // Bring back to 40
    const keys = Array.from(portraitCache.keys());
    for (let i = 0; i < entriesToRemove; i++) {
      portraitCache.delete(keys[i]);
    }
  }

  return canvas;
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

    // Get or generate portrait
    const portraitCanvas = generatePortrait(character, portraitSize);
    ctx.drawImage(portraitCanvas, spacing, yOffset + spacing);

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

    // Level and experience (small text)
    const level = getCharacterLevel(character);
    const exp = getCharacterExperience(character);
    const expToNext = getExpToNextLevel(character);
    
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      `Lvl ${level} - XP: ${exp}/${expToNext}`,
      portraitSize + spacing * 2,
      yOffset + spacing + 60
    );
  });
}
