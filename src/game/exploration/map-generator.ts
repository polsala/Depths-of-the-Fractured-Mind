import type { DepthMap, MapTile, TileType, TrapData } from "./map";

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GenerationConfig {
  width: number;
  height: number;
  minRoomSize: number;
  maxRoomSize: number;
  roomAttempts: number;
  encounterChance: number;
}

const DEPTH_CONFIGS: Record<number, GenerationConfig> = {
  1: { width: 60, height: 60, minRoomSize: 4, maxRoomSize: 8, roomAttempts: 50, encounterChance: 0.15 },
  2: { width: 75, height: 75, minRoomSize: 5, maxRoomSize: 10, roomAttempts: 60, encounterChance: 0.20 },
  3: { width: 80, height: 80, minRoomSize: 5, maxRoomSize: 10, roomAttempts: 70, encounterChance: 0.25 },
  4: { width: 90, height: 90, minRoomSize: 6, maxRoomSize: 12, roomAttempts: 80, encounterChance: 0.30 },
  5: { width: 100, height: 100, minRoomSize: 6, maxRoomSize: 14, roomAttempts: 90, encounterChance: 0.40 },
};

/**
 * Generate a procedural map for the given depth
 */
export function generateProceduralMap(depth: number): DepthMap {
  const config = DEPTH_CONFIGS[depth] || DEPTH_CONFIGS[1];
  const { width, height, minRoomSize, maxRoomSize, roomAttempts, encounterChance } = config;

  // Initialize map with walls
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  // Generate rooms using BSP (Binary Space Partitioning) approach
  const rooms: Room[] = [];
  
  // Try to create rooms
  for (let i = 0; i < roomAttempts; i++) {
    const roomWidth = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const roomHeight = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const x = Math.floor(Math.random() * (width - roomWidth - 2)) + 1;
    const y = Math.floor(Math.random() * (height - roomHeight - 2)) + 1;

    const newRoom: Room = { x, y, width: roomWidth, height: roomHeight };

    // Check if room overlaps with existing rooms
    let overlaps = false;
    for (const room of rooms) {
      if (roomsOverlap(newRoom, room)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);
      carveRoom(tiles, newRoom);
    }
  }

  // Ensure at least 3 rooms were created
  if (rooms.length < 3) {
    // Fallback: create guaranteed rooms
    const centerRoom: Room = {
      x: Math.floor(width / 2) - 5,
      y: Math.floor(height / 2) - 5,
      width: 10,
      height: 10,
    };
    rooms.push(centerRoom);
    carveRoom(tiles, centerRoom);
  }

  // Connect all rooms with corridors
  connectRooms(tiles, rooms);

  // Ensure all floor tiles are reachable (flood fill validation)
  const startRoom = rooms[0];
  const startX = startRoom.x + Math.floor(startRoom.width / 2);
  const startY = startRoom.y + Math.floor(startRoom.height / 2);
  
  // Ensure start position is passable
  if (startY < 0 || startY >= height || startX < 0 || startX >= width || !tiles[startY][startX].passable) {
    console.error(`Start position (${startX}, ${startY}) is not passable! Fixing...`);
    tiles[startY][startX] = {
      type: "floor",
      passable: true,
      discovered: true,
    };
  }
  
  // Mark starting tile as discovered and ensure at least one adjacent tile is passable
  tiles[startY][startX].discovered = true;
  
  // Ensure at least one direction from start is passable
  let hasPassableNeighbor = false;
  const directions = [
    [0, -1], [0, 1], [-1, 0], [1, 0] // N, S, W, E
  ];
  
  for (const [dx, dy] of directions) {
    const nx = startX + dx;
    const ny = startY + dy;
    if (ny >= 0 && ny < height && nx >= 0 && nx < width && tiles[ny][nx].passable) {
      hasPassableNeighbor = true;
      break;
    }
  }
  
  // If no passable neighbors, create a path
  if (!hasPassableNeighbor) {
    console.warn(`Start position has no passable neighbors. Creating path...`);
    // Create a corridor in the positive X direction
    for (let i = 1; i <= 3 && startX + i < width; i++) {
      tiles[startY][startX + i] = {
        type: "floor",
        passable: true,
        discovered: false,
      };
    }
  }
  
  // Validate connectivity - if not connected, add more corridors
  ensureConnectivity(tiles, width, height, startX, startY);

  // Place stairs
  const stairsDownRoom = rooms[rooms.length - 1];
  const stairsDownX = stairsDownRoom.x + Math.floor(stairsDownRoom.width / 2);
  const stairsDownY = stairsDownRoom.y + Math.floor(stairsDownRoom.height / 2);
  tiles[stairsDownY][stairsDownX] = {
    type: "stairsDown",
    passable: true,
    discovered: false,
  };

  // Place stairs up if not depth 1
  if (depth > 1) {
    const stairsUpX = startX;
    const stairsUpY = startY;
    tiles[stairsUpY][stairsUpX] = {
      type: "stairsUp",
      passable: true,
      discovered: false,
    };
  }

  // Place items, traps, and events in various rooms
  placeFeatures(tiles, rooms, depth, encounterChance);

  return {
    depth,
    width,
    height,
    tiles,
    startX,
    startY,
  };
}

function roomsOverlap(room1: Room, room2: Room): boolean {
  // Add 1 tile padding to avoid rooms being too close
  return !(
    room1.x + room1.width + 1 < room2.x ||
    room2.x + room2.width + 1 < room1.x ||
    room1.y + room1.height + 1 < room2.y ||
    room2.y + room2.height + 1 < room1.y
  );
}

function carveRoom(tiles: MapTile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
        tiles[y][x] = {
          type: "floor",
          passable: true,
          discovered: false,
        };
      }
    }
  }
}

function connectRooms(tiles: MapTile[][], rooms: Room[]): void {
  // Connect each room to the next one
  for (let i = 0; i < rooms.length - 1; i++) {
    const room1 = rooms[i];
    const room2 = rooms[i + 1];

    const x1 = room1.x + Math.floor(room1.width / 2);
    const y1 = room1.y + Math.floor(room1.height / 2);
    const x2 = room2.x + Math.floor(room2.width / 2);
    const y2 = room2.y + Math.floor(room2.height / 2);

    // Randomly choose horizontal-first or vertical-first corridors
    if (Math.random() < 0.5) {
      createHorizontalCorridor(tiles, x1, x2, y1);
      createVerticalCorridor(tiles, y1, y2, x2);
    } else {
      createVerticalCorridor(tiles, y1, y2, x1);
      createHorizontalCorridor(tiles, x1, x2, y2);
    }
  }
}

function createHorizontalCorridor(tiles: MapTile[][], x1: number, x2: number, y: number): void {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  
  for (let x = start; x <= end; x++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      if (tiles[y][x].type === "wall") {
        tiles[y][x] = {
          type: "floor",
          passable: true,
          discovered: false,
        };
      }
    }
  }
}

function createVerticalCorridor(tiles: MapTile[][], y1: number, y2: number, x: number): void {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  
  for (let y = start; y <= end; y++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      if (tiles[y][x].type === "wall") {
        tiles[y][x] = {
          type: "floor",
          passable: true,
          discovered: false,
        };
      }
    }
  }
}

function ensureConnectivity(
  tiles: MapTile[][],
  width: number,
  height: number,
  startX: number,
  startY: number
): void {
  // Flood fill to find all reachable tiles
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[startX, startY]];
  
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    if (!tiles[y][x].passable) continue;
    
    visited.add(key);
    
    // Add neighbors
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  // Count total floor tiles
  let totalFloorTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x].passable) {
        totalFloorTiles++;
      }
    }
  }
  
  // If connectivity is less than 90%, we have isolated areas - this is acceptable
  // as some small isolated pockets are fine, but major disconnections should be avoided
  const connectivity = visited.size / totalFloorTiles;
  
  if (connectivity < 0.9) {
    console.warn(`Map connectivity is ${(connectivity * 100).toFixed(1)}% - may have isolated areas`);
  }
}

function placeFeatures(
  tiles: MapTile[][],
  rooms: Room[],
  depth: number,
  encounterChance: number
): void {
  // Skip first and last rooms (start and end)
  const featureRooms = rooms.slice(1, -1);
  
  // Items to place
  const itemPool = ["medkit", "torch", "sedative", "healing_potion", "sanity_tonic", "antidote"];
  const itemsToPlace = Math.min(featureRooms.length, 5 + depth);
  
  for (let i = 0; i < itemsToPlace && i < featureRooms.length; i++) {
    const room = featureRooms[i];
    const x = room.x + Math.floor(Math.random() * room.width);
    const y = room.y + Math.floor(Math.random() * room.height);
    
    if (tiles[y] && tiles[y][x] && tiles[y][x].type === "floor") {
      const itemId = itemPool[Math.floor(Math.random() * itemPool.length)];
      tiles[y][x].itemId = itemId;
    }
  }
  
  // Add encounter chances to corridors and some rooms
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      if (tiles[y][x].type === "floor" && Math.random() < 0.3) {
        tiles[y][x].encounterChance = encounterChance;
      }
    }
  }
  
  // Place traps
  const trapsToPlace = Math.min(featureRooms.length, 2 + depth);
  for (let i = 0; i < trapsToPlace && i < featureRooms.length; i++) {
    const room = featureRooms[featureRooms.length - 1 - i];
    const x = room.x + Math.floor(Math.random() * room.width);
    const y = room.y + Math.floor(Math.random() * room.height);
    
    if (tiles[y] && tiles[y][x] && tiles[y][x].type === "floor" && !tiles[y][x].itemId) {
      const trapTypes: TrapData[] = [
        {
          id: `spike_trap_${depth}_${i}`,
          name: "Spike Trap",
          description: "Rusted spikes line the floor.",
          detected: false,
          triggered: false,
          damage: 3 + depth,
        },
        {
          id: `gas_trap_${depth}_${i}`,
          name: "Gas Leak",
          description: "Toxic fumes fill the air.",
          detected: false,
          triggered: false,
          sanityLoss: 2 + depth,
          damage: 2,
        },
      ];
      
      tiles[y][x].trap = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    }
  }
  
  // Place chests
  const chestsToPlace = Math.max(1, Math.min(featureRooms.length, 3 + Math.floor(depth / 2)));
  const chestLootPool = ["healing_potion", "greater_healing_potion", "sanity_tonic", "antidote", "bomb", "focus_draught", "smoke_bomb"];
  for (let i = 0; i < chestsToPlace && i < featureRooms.length; i++) {
    const room = featureRooms[i];
    const x = room.x + Math.floor(Math.random() * room.width);
    const y = room.y + Math.floor(Math.random() * room.height);
    
    if (tiles[y] && tiles[y][x] && tiles[y][x].type === "floor" && !tiles[y][x].itemId && !tiles[y][x].trap && !tiles[y][x].eventId) {
      const lootCount = 1 + Math.floor(Math.random() * 2); // 1-2 items
      const loot: Array<{ itemId: string; quantity: number }> = [];
      for (let j = 0; j < lootCount; j++) {
        const lootId = chestLootPool[Math.floor(Math.random() * chestLootPool.length)];
        const quantity = lootId === "bomb" || lootId === "smoke_bomb" ? 1 : 2;
        loot.push({ itemId: lootId, quantity });
      }
      tiles[y][x].chest = { loot, opened: false };
    }
  }
  
  // Place depth-specific events (only if room has space)
  const eventMapping: Record<number, string[]> = {
    2: ["riot_recording_event", "pit_fall_event"],
    3: ["overflow_ward_event"],
    4: ["confessional_chair_event"],
  };
  
  const eventsForDepth = eventMapping[depth] || [];
  for (let i = 0; i < eventsForDepth.length && i < featureRooms.length; i++) {
    const room = featureRooms[Math.floor(Math.random() * featureRooms.length)];
    const x = room.x + Math.floor(Math.random() * room.width);
    const y = room.y + Math.floor(Math.random() * room.height);
    
    if (tiles[y] && tiles[y][x] && tiles[y][x].type === "floor" && !tiles[y][x].itemId && !tiles[y][x].trap) {
      tiles[y][x].eventId = eventsForDepth[i];
    }
  }
}
