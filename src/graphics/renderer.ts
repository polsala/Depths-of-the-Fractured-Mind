/**
 * Graphics Renderer - Core rendering engine for the dungeon viewport
 * Inspired by Eye of the Beholder with modern enhancements
 */

export interface ViewportConfig {
  width: number;
  height: number;
  fov: number; // Field of view angle
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: ViewportConfig;
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

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  return { canvas, ctx, config };
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

  return palettes[depth as keyof typeof palettes] || palettes[1];
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
 * Draw a perspective wall segment
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

  // Main wall
  ctx.fillStyle = shadeColor;
  ctx.globalAlpha = brightness;
  ctx.fillRect(xStart, wallTop, width, wallHeight);

  // Wall texture - vertical lines for stone blocks
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2;
  const blockWidth = width / 3;
  for (let i = 0; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(xStart + blockWidth * i, wallTop);
    ctx.lineTo(xStart + blockWidth * i, wallTop + wallHeight);
    ctx.stroke();
  }

  // Horizontal lines for stone courses
  const courseHeight = wallHeight / 4;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(xStart, wallTop + courseHeight * i);
    ctx.lineTo(xStart + width, wallTop + courseHeight * i);
    ctx.stroke();
  }

  // Add accent highlight on near walls
  if (distance < 2) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = brightness * 0.3;
    ctx.strokeRect(xStart + 2, wallTop + 2, width - 4, wallHeight - 4);
  }

  ctx.globalAlpha = 1;
}

/**
 * Main render function for the dungeon viewport
 */
export function renderDungeonView(
  renderCtx: RenderContext,
  viewState: ViewState
): void {
  const { ctx, config } = renderCtx;
  const { width, height } = config;
  const palette = getDepthPalette(viewState.depth);

  // Clear viewport
  clearViewport(renderCtx);

  // Render ceiling
  renderGradient(ctx, 0, 0, width, height / 2, palette.ceiling, palette.wallShade);

  // Render floor
  renderGradient(
    ctx,
    0,
    height / 2,
    width,
    height / 2,
    palette.wallShade,
    palette.floor
  );

  // Draw perspective grid lines on floor
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = 1;

  // Horizontal floor lines (depth)
  for (let i = 1; i <= 5; i++) {
    const y = height / 2 + (height / 2) * (i / 5) * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Vertical floor lines (perspective)
  const vanishingX = width / 2;
  const vanishingY = height / 2;
  for (let i = -2; i <= 2; i++) {
    const xOffset = i * (width / 8);
    ctx.beginPath();
    ctx.moveTo(vanishingX + xOffset * 3, height);
    ctx.lineTo(vanishingX, vanishingY);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // Render walls in perspective (back to front)
  const viewDistance = 4; // How many tiles deep we can see

  for (let distance = viewDistance; distance >= 0; distance--) {
    const scale = 1 / (distance + 1);
    const segmentWidth = width * scale * 0.8;

    // Left wall
    if (distance > 0) {
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

      // Right wall
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
    if (distance === 0) {
      drawWallSegment(
        ctx,
        0,
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
