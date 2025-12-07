/**
 * Minimap renderer - Shows explored dungeon areas
 */

import type { DungeonMap } from "./map";
import { getMapCell } from "./map";
import type { Direction } from "./renderer";

export interface MinimapConfig {
  width: number;
  height: number;
  tileSize: number;
}

/**
 * Render minimap showing current floor layout
 */
export function renderMinimap(
  canvas: HTMLCanvasElement,
  map: DungeonMap,
  playerX: number,
  playerY: number,
  direction: Direction,
  config: MinimapConfig
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = config.width;
  canvas.height = config.height;
  ctx.imageSmoothingEnabled = false;

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, config.width, config.height);

  // Border
  ctx.strokeStyle = "#3d3d3d";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, config.width, config.height);

  const tileSize = config.tileSize;
  const mapHeight = map.length;
  const mapWidth = map[0]?.length || 0;
  
  // Calculate how many tiles can fit in the minimap viewport
  const tilesVisibleX = Math.floor(config.width / tileSize);
  const tilesVisibleY = Math.floor(config.height / tileSize);
  
  // Calculate viewport bounds (which tiles to render)
  // Keep player centered in the minimap
  const viewportMinX = Math.max(0, Math.floor(playerX - tilesVisibleX / 2));
  const viewportMinY = Math.max(0, Math.floor(playerY - tilesVisibleY / 2));
  const viewportMaxX = Math.min(mapWidth, viewportMinX + tilesVisibleX);
  const viewportMaxY = Math.min(mapHeight, viewportMinY + tilesVisibleY);
  
  // Calculate starting position to center the visible tiles
  const startX = (config.width - (viewportMaxX - viewportMinX) * tileSize) / 2;
  const startY = (config.height - (viewportMaxY - viewportMinY) * tileSize) / 2;

  // Draw map tiles (only those in viewport)
  for (let y = viewportMinY; y < viewportMaxY; y++) {
    for (let x = viewportMinX; x < viewportMaxX; x++) {
      const cell = getMapCell(map, x, y);
      if (!cell) continue;

      const tileX = startX + (x - viewportMinX) * tileSize;
      const tileY = startY + (y - viewportMinY) * tileSize;

      if (cell.wall) {
        // Wall tile
        ctx.fillStyle = "#2a2a3a";
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Wall border
        ctx.strokeStyle = "#1a1a2a";
        ctx.lineWidth = 1;
        ctx.strokeRect(tileX, tileY, tileSize, tileSize);
      } else {
        // Floor tile
        ctx.fillStyle = "#4a4a5a";
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Floor detail
        ctx.fillStyle = "#3a3a4a";
        ctx.fillRect(tileX + 1, tileY + 1, tileSize - 2, tileSize - 2);
      }

      // Event marker
      if (cell.event) {
        ctx.fillStyle = "#ffaa00";
        ctx.beginPath();
        ctx.arc(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          tileSize / 4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Door marker
      if (cell.door) {
        ctx.fillStyle = "#8b6f47";
        ctx.fillRect(
          tileX + tileSize * 0.25,
          tileY + tileSize * 0.25,
          tileSize * 0.5,
          tileSize * 0.5
        );
      }

      // Chest marker
      if (cell.chest) {
        ctx.fillStyle = "#b0742a";
        ctx.beginPath();
        ctx.arc(
          tileX + tileSize / 2,
          tileY + tileSize / 2,
          tileSize / 5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  // Draw player position (relative to viewport)
  const playerTileX = startX + (playerX - viewportMinX) * tileSize;
  const playerTileY = startY + (playerY - viewportMinY) * tileSize;

  // Player glow
  const gradient = ctx.createRadialGradient(
    playerTileX + tileSize / 2,
    playerTileY + tileSize / 2,
    0,
    playerTileX + tileSize / 2,
    playerTileY + tileSize / 2,
    tileSize * 1.5
  );
  gradient.addColorStop(0, "rgba(100, 150, 255, 0.3)");
  gradient.addColorStop(1, "rgba(100, 150, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(
    playerTileX - tileSize,
    playerTileY - tileSize,
    tileSize * 3,
    tileSize * 3
  );

  // Player indicator
  ctx.fillStyle = "#6496ff";
  ctx.beginPath();
  ctx.arc(
    playerTileX + tileSize / 2,
    playerTileY + tileSize / 2,
    tileSize / 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Direction arrow
  ctx.save();
  ctx.translate(playerTileX + tileSize / 2, playerTileY + tileSize / 2);
  
  const angle = {
    north: -Math.PI / 2,
    east: 0,
    south: Math.PI / 2,
    west: Math.PI,
  }[direction];
  
  ctx.rotate(angle);
  
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(tileSize / 3, 0);
  ctx.lineTo(-tileSize / 6, tileSize / 6);
  ctx.lineTo(-tileSize / 6, -tileSize / 6);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();

  // Minimap title
  ctx.fillStyle = "#8b9da9";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MAP", config.width / 2, 12);
}
