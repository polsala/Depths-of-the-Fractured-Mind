/**
 * Graphics Renderer - Core rendering engine for the dungeon viewport
 * Inspired by Eye of the Beholder with modern enhancements
 */

import { generateDepthMap, getVisibleWalls, type DungeonMap } from "./map";

// Constants
const MIN_DEPTH = 1;
const MAX_DEPTH = 5;
const DEFAULT_MAP_SIZE = 10;
const DEFAULT_DEPTH = 1;

export interface ViewportConfig {
  width: number;
  height: number;
  fov: number; // Field of view angle
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: ViewportConfig;
  depthMaps: Map<number, DungeonMap>;
}

export type Direction = "north" | "south" | "east" | "west";

export interface ViewState {
  x: number;
  y: number;
  depth: number;
  direction: Direction;
}

/**
 * Creates a rendering context for the dungeon viewport
 */
export function createRenderContext(
  canvas: HTMLCanvasElement,
  config: ViewportConfig
): RenderContext {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D rendering context");
  }

  // Set canvas size
  canvas.width = config.width;
  canvas.height = config.height;

  // Disable image smoothing for crisp, retro pixel-art style
  ctx.imageSmoothingEnabled = false;

  // Initialize depth maps cache
  const depthMaps = new Map<number, DungeonMap>();
  for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
    depthMaps.set(depth, generateDepthMap(depth, DEFAULT_MAP_SIZE));
  }

  return { canvas, ctx, config, depthMaps };
}

/**
 * Clear the viewport
 */
export function clearViewport(renderCtx: RenderContext): void {
  renderCtx.ctx.clearRect(0, 0, renderCtx.config.width, renderCtx.config.height);
}

/**
 * Get color palette based on depth level
 */
export function getDepthPalette(depth: number): {
  ceiling: string;
  floor: string;
  wallBase: string;
  wallShade: string;
  fog: string;
  accent: string;
} {
  const palettes = {
    1: {
      // Depth 1: Cold industrial blues/grays
      ceiling: "#1a1a2e",
      floor: "#16213e",
      wallBase: "#2d3561",
      wallShade: "#1a1f3a",
      fog: "rgba(26, 26, 46, 0.3)",
      accent: "#4a5f8f",
    },
    2: {
      // Depth 2: Archive - warm browns/sepia
      ceiling: "#2a1810",
      floor: "#3d2416",
      wallBase: "#5c3d2e",
      wallShade: "#3a2418",
      fog: "rgba(42, 24, 16, 0.3)",
      accent: "#8b6f47",
    },
    3: {
      // Depth 3: Medical ward - sickly greens
      ceiling: "#1a2618",
      floor: "#1e2e1c",
      wallBase: "#2d4a3a",
      wallShade: "#1e3028",
      fog: "rgba(26, 38, 24, 0.3)",
      accent: "#4d7c5e",
    },
    4: {
      // Depth 4: Mirrors/reflection - purples/violets
      ceiling: "#1e1a2e",
      floor: "#281e3a",
      wallBase: "#3d2d5c",
      wallShade: "#281e3a",
      fog: "rgba(30, 26, 46, 0.3)",
      accent: "#6d4d9e",
    },
    5: {
      // Depth 5: Core - deep reds/corruption
      ceiling: "#2e1a1a",
      floor: "#3a1e1e",
      wallBase: "#5c2d2d",
      wallShade: "#3a1e1e",
      fog: "rgba(46, 26, 26, 0.3)",
      accent: "#9e4d4d",
    },
  };

  return palettes[depth as keyof typeof palettes] || palettes[DEFAULT_DEPTH];
}

/**
 * Create cobblestone floor texture
 */
function createFloorTexture(
  width: number,
  height: number,
  baseColor: string,
  shadeColor: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const base = hexToRgb(baseColor);
  const shade = hexToRgb(shadeColor);

  // Draw cobblestones
  const stoneSize = 8;
  for (let y = 0; y < height; y += stoneSize) {
    for (let x = 0; x < width; x += stoneSize) {
      // Random stone variation
      const variation = Math.random() * 0.3 - 0.15;
      const stoneColor = interpolateColor(shade, base, 0.6 + variation);
      
      ctx.fillStyle = `rgb(${Math.floor(stoneColor.r)}, ${Math.floor(stoneColor.g)}, ${Math.floor(stoneColor.b)})`;
      
      // Draw irregular stone shape
      ctx.beginPath();
      ctx.arc(
        x + stoneSize / 2 + (Math.random() * 2 - 1),
        y + stoneSize / 2 + (Math.random() * 2 - 1),
        stoneSize / 2 - 1,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Dark gaps between stones
      ctx.strokeStyle = `rgb(${Math.floor(shade.r * 0.5)}, ${Math.floor(shade.g * 0.5)}, ${Math.floor(shade.b * 0.5)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * Render a gradient for ceiling or floor
 */
function renderGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color1: string,
  color2: string,
  vertical: boolean = true
): void {
  const gradient = vertical
    ? ctx.createLinearGradient(x, y, x, y + height)
    : ctx.createLinearGradient(x, y, x + width, y);

  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

/**
 * Create detailed pixel art stone texture
 */
function createStoneTexture(
  width: number,
  height: number,
  baseColor: string,
  shadeColor: string,
  accentColor: string,
  brightness: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Parse colors
  const base = hexToRgb(baseColor);
  const shade = hexToRgb(shadeColor);
  const accent = hexToRgb(accentColor);

  // Create stone brick pattern
  const brickWidth = Math.max(8, width / 8);
  const brickHeight = Math.max(6, height / 12);

  for (let row = 0; row < Math.ceil(height / brickHeight); row++) {
    const offset = (row % 2) * (brickWidth / 2);
    for (let col = 0; col < Math.ceil(width / brickWidth) + 1; col++) {
      const x = col * brickWidth - offset;
      const y = row * brickHeight;

      // Base brick color with variation
      const variation = Math.random() * 0.2 - 0.1;
      const brickColor = interpolateColor(shade, base, 0.7 + variation);
      ctx.fillStyle = `rgba(${Math.floor(brickColor.r * brightness)}, ${Math.floor(brickColor.g * brightness)}, ${Math.floor(brickColor.b * brightness)}, 1)`;
      ctx.fillRect(x, y, brickWidth - 2, brickHeight - 2);

      // Mortar (gaps between bricks)
      ctx.fillStyle = `rgba(${Math.floor(shade.r * brightness * 0.5)}, ${Math.floor(shade.g * brightness * 0.5)}, ${Math.floor(shade.b * brightness * 0.5)}, 1)`;
      ctx.fillRect(x + brickWidth - 2, y, 2, brickHeight);
      ctx.fillRect(x, y + brickHeight - 2, brickWidth, 2);

      // Add texture details
      const detailCount = Math.floor(Math.random() * 3);
      for (let d = 0; d < detailCount; d++) {
        const dx = x + Math.random() * (brickWidth - 4) + 2;
        const dy = y + Math.random() * (brickHeight - 4) + 2;
        const size = Math.random() * 2 + 1;
        ctx.fillStyle = `rgba(${Math.floor(shade.r * brightness * 0.7)}, ${Math.floor(shade.g * brightness * 0.7)}, ${Math.floor(shade.b * brightness * 0.7)}, 0.5)`;
        ctx.fillRect(dx, dy, size, size);
      }

      // Highlights on top-left
      ctx.fillStyle = `rgba(${Math.floor(accent.r * brightness)}, ${Math.floor(accent.g * brightness)}, ${Math.floor(accent.b * brightness)}, 0.3)`;
      ctx.fillRect(x, y, brickWidth - 2, 1);
      ctx.fillRect(x, y, 1, brickHeight - 2);
    }
  }

  return canvas;
}

/**
 * Draw torch sconce on wall
 */
function drawTorchSconce(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  timestamp: number = 0
): void {
  // Sconce bracket
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x + size * 0.4, y, size * 0.2, size * 0.4);
  
  // Torch handle
  ctx.fillStyle = "#4a3020";
  ctx.fillRect(x + size * 0.42, y + size * 0.3, size * 0.16, size * 0.5);
  
  // Flame with animation based on timestamp
  const flameY = y + size * 0.2;
  const flameHeight = size * 0.3 + (timestamp > 0 ? Math.sin(timestamp / 100) * 2 : 0);
  
  // Outer flame (orange)
  ctx.fillStyle = "#ff6600";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, flameY - flameHeight);
  ctx.lineTo(x + size * 0.35, flameY);
  ctx.lineTo(x + size * 0.65, flameY);
  ctx.closePath();
  ctx.fill();
  
  // Inner flame (yellow)
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, flameY - flameHeight * 0.7);
  ctx.lineTo(x + size * 0.42, flameY);
  ctx.lineTo(x + size * 0.58, flameY);
  ctx.closePath();
  ctx.fill();
  
  // Flame glow
  const gradient = ctx.createRadialGradient(
    x + size * 0.5,
    flameY - flameHeight / 2,
    0,
    x + size * 0.5,
    flameY - flameHeight / 2,
    size
  );
  gradient.addColorStop(0, "rgba(255, 150, 50, 0.3)");
  gradient.addColorStop(1, "rgba(255, 150, 50, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - size * 0.5, flameY - flameHeight - size * 0.5, size * 2, size * 2);
}

/**
 * Draw dungeon door (exported for future use)
 */
export function drawDungeonDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  distance: number
): void {
  const brightness = Math.max(0.3, 1 - distance * 0.15);
  
  // Door frame (stone)
  ctx.fillStyle = `rgba(60, 60, 70, ${brightness})`;
  ctx.fillRect(x, y, width, height);
  
  // Wooden door
  ctx.fillStyle = `rgba(60, 40, 20, ${brightness})`;
  ctx.fillRect(x + width * 0.1, y + height * 0.05, width * 0.8, height * 0.9);
  
  // Vertical planks
  const plankWidth = width * 0.15;
  for (let i = 0; i < 5; i++) {
    const plankX = x + width * 0.15 + i * plankWidth;
    ctx.strokeStyle = `rgba(50, 35, 15, ${brightness})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plankX, y + height * 0.05);
    ctx.lineTo(plankX, y + height * 0.95);
    ctx.stroke();
  }
  
  // Horizontal metal bands
  ctx.fillStyle = `rgba(80, 80, 80, ${brightness})`;
  ctx.fillRect(x + width * 0.1, y + height * 0.3, width * 0.8, height * 0.05);
  ctx.fillRect(x + width * 0.1, y + height * 0.65, width * 0.8, height * 0.05);
  
  // Metal rivets
  ctx.fillStyle = `rgba(100, 100, 100, ${brightness})`;
  for (let i = 0; i < 6; i++) {
    const rivetX = x + width * (0.2 + i * 0.12);
    ctx.fillRect(rivetX, y + height * 0.3, 3, 3);
    ctx.fillRect(rivetX, y + height * 0.65, 3, 3);
  }
  
  // Door handle
  ctx.fillStyle = `rgba(120, 100, 60, ${brightness})`;
  ctx.fillRect(x + width * 0.75, y + height * 0.5, width * 0.08, height * 0.08);
}

/**
 * Helper function to convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== "string") {
    return { r: 0, g: 0, b: 0 };
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Helper function to interpolate between two colors
 */
function interpolateColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  factor: number
): { r: number; g: number; b: number } {
  return {
    r: c1.r + (c2.r - c1.r) * factor,
    g: c1.g + (c2.g - c1.g) * factor,
    b: c1.b + (c2.b - c1.b) * factor,
  };
}

/**
 * Draw a perspective wall segment with detailed texture
 */
function drawWallSegment(
  ctx: CanvasRenderingContext2D,
  distance: number,
  xStart: number,
  width: number,
  viewHeight: number,
  baseColor: string,
  shadeColor: string,
  accentColor: string
): void {
  // Calculate wall height based on distance (perspective)
  const scale = 1 / (distance + 1);
  const wallHeight = viewHeight * scale * 0.8;
  const wallTop = (viewHeight - wallHeight) / 2;

  // Darken walls based on distance
  const brightness = Math.max(0.3, 1 - distance * 0.15);

  // Create detailed stone texture
  const texture = createStoneTexture(
    Math.floor(width),
    Math.floor(wallHeight),
    baseColor,
    shadeColor,
    accentColor,
    brightness
  );

  // Draw textured wall
  ctx.drawImage(texture, xStart, wallTop);

  // Add depth shading
  const gradient = ctx.createLinearGradient(xStart, wallTop, xStart + width, wallTop);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${0.3 * (1 - brightness)})`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${0.1 * (1 - brightness)})`);
  gradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 * (1 - brightness)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(xStart, wallTop, width, wallHeight);
}

/**
 * Main render function for the dungeon viewport
 */
export function renderDungeonView(
  renderCtx: RenderContext,
  viewState: ViewState
): void {
  const { ctx, config, depthMaps } = renderCtx;
  const { width, height } = config;
  const palette = getDepthPalette(viewState.depth);

  // Clear viewport
  clearViewport(renderCtx);

  // Get the map for current depth
  const map = depthMaps.get(viewState.depth);
  if (!map) {
    console.warn(`No map found for depth ${viewState.depth}`);
    return;
  }

  // Render ceiling with gradient
  renderGradient(ctx, 0, 0, width, height / 2, palette.ceiling, palette.wallShade);

  // Render textured floor
  const floorTexture = createFloorTexture(width, height / 2, palette.floor, palette.wallShade);
  ctx.drawImage(floorTexture, 0, height / 2);
  
  // Add perspective fade to floor
  const floorGradient = ctx.createLinearGradient(0, height / 2, 0, height);
  floorGradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");
  floorGradient.addColorStop(1, "rgba(0, 0, 0, 0.1)");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, height / 2, width, height / 2);

  // Render walls based on map data (back to front)
  const viewDistance = 4; // How many tiles deep we can see

  for (let distance = viewDistance; distance >= 0; distance--) {
    const walls = getVisibleWalls(
      map,
      viewState.x,
      viewState.y,
      viewState.direction,
      distance
    );

    const scale = 1 / (distance + 1);
    const segmentWidth = width * scale * 0.8;

    // Left wall (if visible)
    if (distance > 0 && walls.left) {
      drawWallSegment(
        ctx,
        distance,
        0,
        (width - segmentWidth) / 2,
        height,
        palette.wallBase,
        palette.wallShade,
        palette.accent
      );
    }

    // Right wall (if visible)
    if (distance > 0 && walls.right) {
      drawWallSegment(
        ctx,
        distance,
        width - (width - segmentWidth) / 2,
        (width - segmentWidth) / 2,
        height,
        palette.wallBase,
        palette.wallShade,
        palette.accent
      );
    }

    // Front wall (if blocked)
    if (walls.front) {
      drawWallSegment(
        ctx,
        distance,
        (width - segmentWidth) / 2,
        segmentWidth,
        height,
        palette.wallBase,
        palette.wallShade,
        palette.accent
      );
    }
  }

  // Add atmospheric fog overlay
  const fogGradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 2
  );
  fogGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  fogGradient.addColorStop(1, palette.fog);
  ctx.fillStyle = fogGradient;
  ctx.fillRect(0, 0, width, height);

  // Add torches on visible walls
  for (let distance = 3; distance >= 1; distance--) {
    const walls = getVisibleWalls(
      map,
      viewState.x,
      viewState.y,
      viewState.direction,
      distance
    );

    const scale = 1 / (distance + 1);
    const segmentWidth = width * scale * 0.8;
    const wallHeight = height * scale * 0.8;
    const wallTop = (height - wallHeight) / 2;

    // Use consistent timestamp for animation
    const timestamp = Date.now();

    // Left wall torch
    if (walls.left && distance % 2 === 1) {
      const torchSize = Math.max(20, wallHeight * 0.15);
      drawTorchSconce(
        ctx,
        (width - segmentWidth) / 4,
        wallTop + wallHeight * 0.3,
        torchSize,
        timestamp
      );
    }

    // Right wall torch
    if (walls.right && distance % 2 === 0) {
      const torchSize = Math.max(20, wallHeight * 0.15);
      drawTorchSconce(
        ctx,
        width - (width - segmentWidth) / 4 - torchSize,
        wallTop + wallHeight * 0.3,
        torchSize,
        timestamp
      );
    }
  }

  // Add vignette effect
  const vignetteGradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width / 4,
    width / 2,
    height / 2,
    width / 1.5
  );
  vignetteGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignetteGradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, width, height);
}
