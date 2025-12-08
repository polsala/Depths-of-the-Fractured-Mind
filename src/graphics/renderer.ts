/**
 * Graphics Renderer - Core rendering engine for the dungeon viewport
 * Inspired by Eye of the Beholder with modern enhancements
 */

import { generateDepthMap, getVisibleWalls, type DungeonMap } from "./map";
import type { DepthMap } from "../game/exploration/map";

// Constants
const MIN_DEPTH = 1;
const MAX_DEPTH = 5;
const DEFAULT_DEPTH = 1;
const chestSprite = new Image();
const basePath = import.meta.env.BASE_URL || "/";
const normalizedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;
chestSprite.src = `${normalizedBasePath}assets/sprites/objects/chest.png`;
const stairsUpSprite = new Image();
stairsUpSprite.src = `${normalizedBasePath}assets/tilesets/floors/strais_up.png`;
const stairsDownSprite = new Image();
stairsDownSprite.src = `${normalizedBasePath}assets/tilesets/floors/strais_down.png`;
const vendorSprite = new Image();
vendorSprite.src = `${normalizedBasePath}assets/sprites/characters/npc/vendor.png`;

const textureCache = new Map<string, HTMLImageElement>();

const depthTextures: Record<
  number,
  { wall: string; floor: string; door?: string; wallAlt?: string }
> = {
  1: {
    wall: `${normalizedBasePath}assets/textures/depth1/d1_wall_base_threshold.png`,
    wallAlt: `${normalizedBasePath}assets/textures/depth1/d1_wall_warning_stripes.png`,
    floor: `${normalizedBasePath}assets/textures/depth1/d1_floor_linoleum.png`,
    door: `${normalizedBasePath}assets/textures/depth1/d1_door_metal_security.png`,
  },
  2: {
    wall: `${normalizedBasePath}assets/textures/depth2/d2_wall_archive_cabinets.png`,
    floor: `${normalizedBasePath}assets/textures/depth2/d2_floor_office_tiles.png`,
    door: `${normalizedBasePath}assets/textures/depth2/d2_door_records.png`,
  },
  3: {
    wall: `${normalizedBasePath}assets/textures/depth3/d3_wall_hospital.png`,
    wallAlt: `${normalizedBasePath}assets/textures/depth3/d3_wall_padded_cell.png`,
    floor: `${normalizedBasePath}assets/textures/depth3/d3_floor_hospital_tiles.png`,
    door: `${normalizedBasePath}assets/textures/depth3/d3_door_medical.png`,
  },
  4: {
    wall: `${normalizedBasePath}assets/textures/depth4/d4_wall_mirrored_panels.png`,
    wallAlt: `${normalizedBasePath}assets/textures/depth4/d4_wall_fractured_mirror.png`,
    floor: `${normalizedBasePath}assets/textures/depth4/d4_floor_dark_reflective.png`,
  },
  5: {
    wall: `${normalizedBasePath}assets/textures/depth5/d5_wall_biomech.png`,
    floor: `${normalizedBasePath}assets/textures/depth5/d5_floor_metal_grate.png`,
    door: `${normalizedBasePath}assets/textures/depth5/d5_door_core_bulkhead.png`,
  },
};

const globalTextures = {
  ceiling: `${normalizedBasePath}assets/textures/global/ceiling_concrete_panels.png`,
  overlay: `${normalizedBasePath}assets/textures/global/global_overlay_cracks.png`,
};

const pendingTextureLoads = new WeakSet<HTMLImageElement>();

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
 * @param canvas - The HTML canvas element to render to
 * @param config - Viewport configuration (width, height, FOV)
 * @param gameDepthMapsCache - Optional cache of game DepthMaps from the game state.
 *                             When provided, ensures the renderer uses the same maps as the game logic,
 *                             preventing map regeneration during rendering or movement.
 */
export function createRenderContext(
  canvas: HTMLCanvasElement,
  config: ViewportConfig,
  gameDepthMapsCache?: Map<number, DepthMap>
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

  // Initialize depth maps cache, using the game's cached maps if provided
  const depthMaps = new Map<number, DungeonMap>();
  for (let depth = MIN_DEPTH; depth <= MAX_DEPTH; depth++) {
    depthMaps.set(depth, generateDepthMap(depth, gameDepthMapsCache));
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

function getTexture(src: string): HTMLImageElement {
  if (!src) {
    return new Image();
  }
  const cached = textureCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  textureCache.set(src, img);
  return img;
}

function queueTextureRedraw(
  texture: HTMLImageElement | undefined,
  renderCtx: RenderContext,
  viewState: ViewState
): void {
  if (!texture || texture.complete || pendingTextureLoads.has(texture)) {
    return;
  }
  pendingTextureLoads.add(texture);
  texture
    .decode()
    .then(() => {
      pendingTextureLoads.delete(texture);
      renderDungeonView(renderCtx, viewState);
    })
    .catch(() => pendingTextureLoads.delete(texture));
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
 * Create simple tiled ceiling texture
 */
function createCeilingTexture(
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

  const tileSize = 8;
  const altColor = interpolateColor(base, shade, 0.25);

  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      const useAlt = ((x / tileSize + y / tileSize) | 0) % 2 === 1;
      const color = useAlt ? altColor : base;
      ctx.fillStyle = `rgb(${Math.floor(color.r)}, ${Math.floor(color.g)}, ${Math.floor(color.b)})`;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  return canvas;
}

function fillTiledTexture(
  ctx: CanvasRenderingContext2D,
  texture: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): void {
  if (!texture.complete || texture.naturalWidth === 0) {
    return;
  }
  const pattern = ctx.createPattern(texture, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, width + texture.width, height + texture.height);
  ctx.restore();
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
 * Main render function for the dungeon viewport
 */
export function renderDungeonView(
  renderCtx: RenderContext,
  viewState: ViewState
): void {
  const { ctx, config, depthMaps } = renderCtx;
  const { width, height } = config;
  const palette = getDepthPalette(viewState.depth);
  const ceilingHeight = Math.ceil(height / 2);
  const floorHeight = height - ceilingHeight;
  const floorY = ceilingHeight;
  const fov = config.fov || 60;
  const posX = viewState.x + 0.5;
  const posY = viewState.y + 0.5;
  let dirX = 0;
  let dirY = -1;
  switch (viewState.direction) {
    case "north":
      dirX = 0;
      dirY = -1;
      break;
    case "south":
      dirX = 0;
      dirY = 1;
      break;
    case "east":
      dirX = 1;
      dirY = 0;
      break;
    case "west":
      dirX = -1;
      dirY = 0;
      break;
  }
  const fovRad = (fov * Math.PI) / 180;
  const planeMag = Math.tan(fovRad / 2);
  const planeX = -dirY * planeMag;
  const planeY = dirX * planeMag;
  const depthTexture = depthTextures[viewState.depth] || depthTextures[DEFAULT_DEPTH];
  const wallTexture = depthTexture ? getTexture(depthTexture.wall) : undefined;
  const wallAltTexture = depthTexture?.wallAlt ? getTexture(depthTexture.wallAlt) : undefined;
  const floorTextureImg = depthTexture ? getTexture(depthTexture.floor) : undefined;
  const ceilingTextureImg = getTexture(globalTextures.ceiling);
  const globalOverlayTexture = getTexture(globalTextures.overlay);

  // Clear viewport
  clearViewport(renderCtx);

  // Get the map for current depth
  const map = depthMaps.get(viewState.depth);
  if (!map) {
    console.warn(`No map found for depth ${viewState.depth}`);
    return;
  }

  // Render ceiling with perspective-aware tiling
  const ceilingPattern =
    ceilingTextureImg.complete && ceilingTextureImg.naturalWidth > 0
      ? ctx.createPattern(ceilingTextureImg, "repeat")
      : null;
  if (ceilingPattern && ceilingPattern.setTransform) {
    const texW = ceilingTextureImg.naturalWidth || 32;
    const texH = ceilingTextureImg.naturalHeight || 32;
    const horizon = height / 2;
    for (let y = 0; y < ceilingHeight; y++) {
      const p = horizon - y;
      const rowDist = horizon / Math.max(1, p);
      const scale = Math.min(4, Math.max(0.15, 1 / rowDist));
      const offsetX = -(posX * texW * scale);
      const offsetY = -(posY * texH * scale);
      ceilingPattern.setTransform(new DOMMatrix([scale, 0, 0, scale, offsetX, offsetY]));
      ctx.fillStyle = ceilingPattern;
      ctx.fillRect(0, y, width, 1);
    }
  } else {
    queueTextureRedraw(ceilingTextureImg, renderCtx, viewState);
    const ceilingTileSize = 8;
    const ceilingTexture = createCeilingTexture(
      ceilingTileSize * 2,
      ceilingTileSize * 2,
      palette.ceiling,
      palette.wallShade
    );
    ctx.drawImage(ceilingTexture, 0, 0, width, ceilingHeight);
  }
  const ceilingGradient = ctx.createLinearGradient(0, 0, 0, ceilingHeight);
  ceilingGradient.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  ceilingGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = ceilingGradient;
  ctx.fillRect(0, 0, width, ceilingHeight);
  // Darken ceiling edges toward the walls to anchor the surface
  const ceilingSideFade = ctx.createLinearGradient(0, 0, width / 2, 0);
  ceilingSideFade.addColorStop(0, "rgba(0, 0, 0, 0.35)");
  ceilingSideFade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = ceilingSideFade;
  ctx.fillRect(0, 0, width / 2, ceilingHeight);
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.fillRect(0, 0, width / 2, ceilingHeight);
  ctx.restore();
  // Small lip where ceiling meets walls for a clear seam
  ctx.fillStyle = palette.wallShade;
  ctx.fillRect(0, ceilingHeight - 2, width, 2);

  // Render textured floor with perspective-aware tiling
  const floorPattern =
    floorTextureImg && floorTextureImg.complete && floorTextureImg.naturalWidth > 0
      ? ctx.createPattern(floorTextureImg, "repeat")
      : null;
  if (floorPattern && floorPattern.setTransform) {
    const texW = floorTextureImg?.naturalWidth || 32;
    const texH = floorTextureImg?.naturalHeight || 32;
    const horizon = height / 2;
    for (let y = floorY; y < height; y++) {
      const p = y - horizon;
      const rowDist = horizon / Math.max(1, p);
      const scale = Math.min(4, Math.max(0.15, 1 / rowDist));
      const offsetX = -(posX * texW * scale);
      const offsetY = -(posY * texH * scale);
      floorPattern.setTransform(new DOMMatrix([scale, 0, 0, scale, offsetX, offsetY]));
      ctx.fillStyle = floorPattern;
      ctx.fillRect(0, y, width, 1);
    }
  } else {
    queueTextureRedraw(floorTextureImg, renderCtx, viewState);
    const floorTexture = createFloorTexture(width, floorHeight, palette.floor, palette.wallShade);
    ctx.drawImage(floorTexture, 0, floorY);
  }

  // Add perspective fade to floor
  const floorGradient = ctx.createLinearGradient(0, floorY, 0, height);
  floorGradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");
  floorGradient.addColorStop(1, "rgba(0, 0, 0, 0.1)");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, floorY, width, floorHeight);

  // Render walls via grid-aligned raycasting (low-res, Eye of the Beholder style)
  const wallBaseRgb = hexToRgb(palette.wallBase);
  const wallShadeRgb = hexToRgb(palette.wallShade);

  const maxRayDepth = 16;
  for (let x = 0; x < width; x++) {
    const cameraX = (2 * x) / width - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(posX);
    let mapY = Math.floor(posY);

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let sideDistX: number;
    let sideDistY: number;
    let stepX: number;
    let stepY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (posX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - posX) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (posY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - posY) * deltaDistY;
    }

    let hit = false;
    let side = 0;
    let depth = 0;

    while (!hit && depth < maxRayDepth) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      const cell = map[mapY]?.[mapX];
      if (!cell || cell.wall) {
        hit = true;
      }
      depth++;
    }

    if (!hit) continue;

    let perpWallDist =
      side === 0
        ? (mapX - posX + (1 - stepX) / 2) / rayDirX
        : (mapY - posY + (1 - stepY) / 2) / rayDirY;
    if (perpWallDist < 0.0001) perpWallDist = 0.0001;

    const lineHeight = Math.min(height, Math.floor(height / perpWallDist));
    const drawStart = Math.max(0, Math.floor(-lineHeight / 2 + height / 2));
    const drawEnd = Math.min(height, Math.floor(lineHeight / 2 + height / 2));

    const shadeFactor = Math.max(0.35, 1 - perpWallDist * 0.15);
    const useAltTexture =
      !!wallAltTexture && (Math.abs(mapX + mapY) % 6 === 0 || Math.abs(mapX - mapY) % 5 === 0);
    const tex = useAltTexture ? wallAltTexture : wallTexture;

    if (tex && tex.complete && tex.naturalWidth > 0) {
      let wallX =
        side === 0
          ? posY + perpWallDist * rayDirY
          : posX + perpWallDist * rayDirX;
      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * tex.naturalWidth);
      if (side === 0 && rayDirX > 0) texX = tex.naturalWidth - texX - 1;
      if (side === 1 && rayDirY < 0) texX = tex.naturalWidth - texX - 1;

      ctx.drawImage(tex, texX, 0, 1, tex.naturalHeight, x, drawStart, 1, drawEnd - drawStart);
      const shadeAlpha = Math.min(0.65, 1 - shadeFactor);
      if (shadeAlpha > 0.01) {
        ctx.fillStyle = `rgba(0, 0, 0, ${shadeAlpha})`;
        ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
      }
    } else {
      const colorSource = side === 1 ? wallShadeRgb : wallBaseRgb;
      const shadeColor = {
        r: Math.floor(colorSource.r * shadeFactor),
        g: Math.floor(colorSource.g * shadeFactor),
        b: Math.floor(colorSource.b * shadeFactor),
      };
      ctx.fillStyle = `rgb(${shadeColor.r}, ${shadeColor.g}, ${shadeColor.b})`;
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }
  }

  const viewDistance = 6;

  const resolveTarget = (distance: number): { x: number; y: number } => {
    let targetX = viewState.x;
    let targetY = viewState.y;
    switch (viewState.direction) {
      case "north":
        targetY -= distance;
        break;
      case "south":
        targetY += distance;
        break;
      case "east":
        targetX += distance;
        break;
      case "west":
        targetX -= distance;
        break;
    }
    return { x: targetX, y: targetY };
  };

  const drawBillboard = (
    distance: number,
    sprite: HTMLImageElement,
    fallbackColor: string,
    sizeFactor: number
  ): void => {
    const distScale = Math.max(0.3, 1 / (distance + 0.1));
    const spriteSize = Math.max(32, 96 * distScale * sizeFactor);
    const spriteX = width / 2 - spriteSize / 2;
    const spriteY = height * 0.68 - spriteSize;
    if (sprite.complete) {
      ctx.drawImage(sprite, spriteX, spriteY, spriteSize, spriteSize);
    } else {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(spriteX, spriteY, spriteSize, spriteSize * 0.6);
    }
  };

  // Draw stairs up as billboards in view
  for (let distance = 1; distance <= viewDistance; distance++) {
    const target = resolveTarget(distance);
    const cell = map[target.y]?.[target.x];
    if (!cell || !cell.stairsUp) continue;
    drawBillboard(distance, stairsUpSprite, "#7fd0ff", 1);
  }

  // Draw stairs down as billboards in view
  for (let distance = 1; distance <= viewDistance; distance++) {
    const target = resolveTarget(distance);
    const cell = map[target.y]?.[target.x];
    if (!cell || !cell.stairsDown) continue;
    drawBillboard(distance, stairsDownSprite, "#ff7f7f", 1);
  }

  // Draw vendor as billboard
  for (let distance = 1; distance <= viewDistance; distance++) {
    const target = resolveTarget(distance);
    const cell = map[target.y]?.[target.x];
    if (!cell || !cell.vendor) continue;
    drawBillboard(distance, vendorSprite, "#b48bff", 0.9);
  }

  // Draw chests within view as billboards
  for (let distance = 1; distance <= viewDistance; distance++) {
    const target = resolveTarget(distance);
    const cell = map[target.y]?.[target.x];
    if (!cell || !cell.chest) continue;
    drawBillboard(distance, chestSprite, "#b0742a", 0.85);
  }

  // Subtle global crack overlay to bind surfaces
  if (globalOverlayTexture.complete && globalOverlayTexture.naturalWidth > 0) {
    const offsetX =
      -((viewState.x * globalOverlayTexture.width) % globalOverlayTexture.width);
    const offsetY =
      -((viewState.y * globalOverlayTexture.height) % globalOverlayTexture.height);
    ctx.save();
    ctx.globalAlpha = 0.18;
    fillTiledTexture(ctx, globalOverlayTexture, 0, 0, width, height, offsetX, offsetY);
    ctx.restore();
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

  // Add torches on nearest visible side walls
  const nearestWalls = getVisibleWalls(
    map,
    viewState.x,
    viewState.y,
    viewState.direction,
    1
  );
  const timestamp = Date.now();
  const torchSize = Math.max(14, height * 0.08);
  const torchY = height * 0.45;

  if (nearestWalls.left) {
    drawTorchSconce(ctx, width * 0.08, torchY, torchSize, timestamp);
  }

  if (nearestWalls.right) {
    drawTorchSconce(ctx, width * 0.92 - torchSize, torchY, torchSize, timestamp);
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
