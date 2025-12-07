/**
 * Character Sprite Loader and Manager
 * Loads and manages character sprite sheets from /public/assets/sprites/characters/
 */

import type { CharacterId } from "../game/state";

export type SpriteAction = 
  | "IDLE"
  | "WALK_NORTH"
  | "WALK_SOUTH"
  | "WALK_EAST"
  | "WALK_WEST"
  | "ATTACK"
  | "CAST"
  | "HIT"
  | "DEATH";

// Sprite sheet dimensions
const SPRITE_SHEET_WIDTH = 1024;
const SPRITE_SHEET_HEIGHT = 1024;

interface SpriteSheet {
  image: HTMLImageElement;
  loaded: boolean;
  frameWidth: number;
  frameHeight: number;
}

// Map character IDs to their sprite file names
const CHARACTER_SPRITE_FILES: Record<CharacterId, string> = {
  elias: "CHAR_001.png",
  miriam: "CHAR_002.png",
  subject13: "CHAR_003.png",
  anya: "CHAR_004.png",
};

// Standard sprite sheet layout (typical RPG Maker style: 4 columns x 9 rows)
// Rows: WALK_SOUTH (0), WALK_WEST (1), WALK_EAST (2), WALK_NORTH (3), 
//       ATTACK (4), CAST (5), HIT (6), DEATH (7), IDLE (8)
const SPRITE_LAYOUT = {
  rows: 9,
  cols: 4,
  actions: {
    IDLE: { row: 8, col: 0 },
    WALK_SOUTH: { row: 0, col: 0 },
    WALK_WEST: { row: 1, col: 0 },
    WALK_EAST: { row: 2, col: 0 },
    WALK_NORTH: { row: 3, col: 0 },
    ATTACK: { row: 4, col: 0 },
    CAST: { row: 5, col: 0 },
    HIT: { row: 6, col: 0 },
    DEATH: { row: 7, col: 0 },
  } as Record<SpriteAction, { row: number; col: number }>,
};

// Cache for loaded sprite sheets
const spriteCache = new Map<CharacterId, SpriteSheet>();

/**
 * Load a character's sprite sheet
 */
export function loadCharacterSprite(characterId: CharacterId): Promise<SpriteSheet> {
  return new Promise((resolve, reject) => {
    // Check cache first
    const cached = spriteCache.get(characterId);
    if (cached && cached.loaded) {
      resolve(cached);
      return;
    }

    const basePath = import.meta.env.BASE_URL || "/";
    const normalizedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;
    const fileName = CHARACTER_SPRITE_FILES[characterId];
    const spritePath = `${normalizedBasePath}assets/sprites/characters/${characterId}/${fileName}`;

    const image = new Image();
    const spriteSheet: SpriteSheet = {
      image,
      loaded: false,
      frameWidth: SPRITE_SHEET_WIDTH / SPRITE_LAYOUT.cols,
      frameHeight: SPRITE_SHEET_HEIGHT / SPRITE_LAYOUT.rows,
    };

    image.onload = () => {
      spriteSheet.loaded = true;
      spriteCache.set(characterId, spriteSheet);
      resolve(spriteSheet);
    };

    image.onerror = () => {
      reject(new Error(`Failed to load sprite for ${characterId} at ${spritePath}`));
    };

    image.src = spritePath;
  });
}

/**
 * Preload all character sprites
 */
export async function preloadAllCharacterSprites(): Promise<void> {
  const characterIds: CharacterId[] = ["elias", "miriam", "subject13", "anya"];
  await Promise.all(characterIds.map(id => loadCharacterSprite(id)));
}

/**
 * Draw a specific sprite frame to a canvas
 */
export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  characterId: CharacterId,
  action: SpriteAction,
  x: number,
  y: number,
  width: number,
  height: number,
  frame: number = 0
): void {
  const spriteSheet = spriteCache.get(characterId);
  if (!spriteSheet || !spriteSheet.loaded) {
    // Fallback: draw a placeholder
    ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
    ctx.fillRect(x, y, width, height);
    return;
  }

  const layout = SPRITE_LAYOUT.actions[action];
  const col = (layout.col + frame) % SPRITE_LAYOUT.cols;
  
  const sx = col * spriteSheet.frameWidth;
  const sy = layout.row * spriteSheet.frameHeight;
  const sw = spriteSheet.frameWidth;
  const sh = spriteSheet.frameHeight;

  // Preserve transparency
  ctx.save();
  ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering
  ctx.drawImage(
    spriteSheet.image,
    sx, sy, sw, sh,  // Source rectangle
    x, y, width, height  // Destination rectangle
  );
  ctx.restore();
}

/**
 * Create a portrait canvas from a character sprite
 */
export function createSpritePortrait(
  characterId: CharacterId,
  size: number,
  action: SpriteAction = "IDLE"
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    return canvas;
  }

  const spriteSheet = spriteCache.get(characterId);
  if (!spriteSheet || !spriteSheet.loaded) {
    // Draw placeholder
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Loading...", size / 2, size / 2);
    return canvas;
  }

  // Draw the sprite action frame
  drawCharacterSprite(ctx, characterId, action, 0, 0, size, size, 0);

  // Add border
  ctx.strokeStyle = "#8b9da9";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, size, size);

  return canvas;
}

/**
 * Get a sprite sheet if it's already loaded (synchronous)
 */
export function getSpriteSheet(characterId: CharacterId): SpriteSheet | undefined {
  return spriteCache.get(characterId);
}

/**
 * Check if a character sprite is loaded
 */
export function isSpriteLoaded(characterId: CharacterId): boolean {
  const sheet = spriteCache.get(characterId);
  return sheet !== undefined && sheet.loaded;
}
