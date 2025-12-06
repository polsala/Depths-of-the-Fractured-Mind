import type { GameState } from "../state";

export type TileType = "wall" | "floor" | "stairsDown" | "stairsUp" | "door";

export interface TrapData {
  id: string;
  name: string;
  description: string;
  detected: boolean;
  triggered: boolean;
  damage?: number;
  sanityLoss?: number;
  effect?: string;
}

export interface MapTile {
  type: TileType;
  passable: boolean;
  eventId?: string;
  encounterChance?: number;
  trap?: TrapData;
  itemId?: string;
  discovered?: boolean;
  locked?: boolean;
  interactionText?: string;
}

export interface DepthMap {
  depth: number;
  width: number;
  height: number;
  tiles: MapTile[][]; // [y][x]
  startX: number;
  startY: number;
}

function createDepth1Map(): DepthMap {
  const width = 12;
  const height = 12;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  const carveFloor = (x: number, y: number, overrides: Partial<MapTile> = {}) => {
    tiles[y][x] = {
      type: "floor",
      passable: true,
      discovered: false,
      ...overrides,
    };
  };

  // Main corridor - The Threshold
  for (let x = 2; x < 10; x += 1) {
    carveFloor(x, 2);
    carveFloor(x, 6, { encounterChance: 0.15 });
  }

  for (let y = 2; y < 10; y += 1) {
    carveFloor(2, y);
    carveFloor(6, y, { encounterChance: 0.15 });
  }

  // Small side rooms with items
  carveFloor(8, 3, { itemId: "torch" });
  carveFloor(9, 3);
  carveFloor(8, 4, { itemId: "medkit" });

  // Trap corridor
  carveFloor(4, 8, {
    trap: {
      id: "spike_trap_1",
      name: "Spike Trap",
      description: "Rusted spikes line the floor, barely visible beneath debris.",
      detected: false,
      triggered: false,
      damage: 5,
    },
  });

  // Event room
  carveFloor(9, 9, { itemId: "patient_journal" });

  // Stairs down
  tiles[9][6] = { type: "stairsDown", passable: true, discovered: false };

  return {
    depth: 1,
    width,
    height,
    tiles,
    startX: 2,
    startY: 2,
  };
}

function createDepth2Map(): DepthMap {
  // Depth 2 - The Archive
  const width = 15;
  const height = 15;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  const carveFloor = (x: number, y: number, overrides: Partial<MapTile> = {}) => {
    tiles[y][x] = {
      type: "floor",
      passable: true,
      discovered: false,
      ...overrides,
    };
  };

  // Stairs up from Depth 1
  tiles[2][2] = { type: "stairsUp", passable: true, discovered: false };

  // Archive corridors with file rooms
  for (let x = 2; x < 13; x += 1) {
    carveFloor(x, 2);
    carveFloor(x, 7, { encounterChance: 0.2 });
  }

  for (let y = 2; y < 13; y += 1) {
    carveFloor(7, y, { encounterChance: 0.2 });
  }

  // File rooms with lore items
  carveFloor(4, 4, { itemId: "staff_memo" });
  carveFloor(4, 5);
  carveFloor(5, 4);

  carveFloor(10, 4, { itemId: "rusty_key" });
  carveFloor(11, 4);

  // Riot recording event room
  carveFloor(10, 10, { eventId: "riot_recording_event" });
  carveFloor(11, 10);

  // Locked door requiring key
  tiles[7][12] = {
    type: "door",
    passable: false,
    locked: true,
    discovered: false,
  };

  // Pit fall event location
  carveFloor(5, 9, { eventId: "pit_fall_event" });

  // Hidden supply cache
  carveFloor(3, 12, { itemId: "medkit", encounterChance: 0.1 });

  // Stairs down
  tiles[12][7] = { type: "stairsDown", passable: true, discovered: false };

  return {
    depth: 2,
    width,
    height,
    tiles,
    startX: 2,
    startY: 2,
  };
}

function createDepth3Map(): DepthMap {
  // Depth 3 - The Ward
  const width = 16;
  const height = 16;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  const carveFloor = (x: number, y: number, overrides: Partial<MapTile> = {}) => {
    tiles[y][x] = {
      type: "floor",
      passable: true,
      discovered: false,
      ...overrides,
    };
  };

  // Stairs up
  tiles[2][2] = { type: "stairsUp", passable: true, discovered: false };

  // Ward corridors
  for (let x = 2; x < 14; x += 1) {
    carveFloor(x, 4);
    carveFloor(x, 8, { encounterChance: 0.25 });
  }

  for (let y = 2; y < 14; y += 1) {
    carveFloor(8, y, { encounterChance: 0.25 });
  }

  // Patient rooms
  carveFloor(4, 2);
  carveFloor(5, 2, { itemId: "sedative" });

  carveFloor(11, 2);
  carveFloor(12, 2, { itemId: "medkit" });

  // Overflow ward - Miriam's event
  carveFloor(13, 8, { eventId: "overflow_ward_event" });
  carveFloor(13, 9);
  carveFloor(13, 10);

  // Surgery room with trap
  carveFloor(4, 12, {
    trap: {
      id: "gas_trap_1",
      name: "Gas Leak",
      description: "A hissing sound emanates from broken pipes. Toxic fumes fill the air.",
      detected: false,
      triggered: false,
      sanityLoss: 3,
      damage: 3,
    },
  });

  // Confessional area
  carveFloor(2, 13);
  carveFloor(3, 13, { itemId: "access_card" });

  // Stairs down
  tiles[13][13] = { type: "stairsDown", passable: true, discovered: false };

  return {
    depth: 3,
    width,
    height,
    tiles,
    startX: 2,
    startY: 2,
  };
}

function createDepth4Map(): DepthMap {
  // Depth 4 - Labyrinth of Mirrors
  const width = 18;
  const height = 18;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  const carveFloor = (x: number, y: number, overrides: Partial<MapTile> = {}) => {
    tiles[y][x] = {
      type: "floor",
      passable: true,
      discovered: false,
      ...overrides,
    };
  };

  // Stairs up
  tiles[3][3] = { type: "stairsUp", passable: true, discovered: false };

  // Confusing maze-like corridors
  for (let x = 3; x < 15; x += 1) {
    carveFloor(x, 3);
    carveFloor(x, 9, { encounterChance: 0.3 });
    carveFloor(x, 15, { encounterChance: 0.3 });
  }

  for (let y = 3; y < 15; y += 1) {
    carveFloor(3, y, { encounterChance: 0.3 });
    carveFloor(9, y, { encounterChance: 0.3 });
    carveFloor(15, y, { encounterChance: 0.3 });
  }

  // Mirror rooms (confusing layout)
  carveFloor(6, 6, {
    interactionText: "A wall of mirrors reflects infinite versions of yourself. Something seems wrong.",
  });
  carveFloor(6, 7);
  carveFloor(7, 6);

  // Confessional chair - Anya's event
  carveFloor(12, 6, { eventId: "confessional_chair_event" });
  carveFloor(12, 7);

  // Illusion trap
  carveFloor(9, 12, {
    trap: {
      id: "illusion_trap",
      name: "Reality Distortion",
      description: "The walls seem to shift and breathe. Your mind struggles to distinguish real from false.",
      detected: false,
      triggered: false,
      sanityLoss: 5,
    },
  });

  // Items scattered
  carveFloor(5, 12, { itemId: "torch" });
  carveFloor(14, 10, { itemId: "sedative" });

  // Stairs down to Core
  tiles[15][15] = { type: "stairsDown", passable: true, discovered: false };

  return {
    depth: 4,
    width,
    height,
    tiles,
    startX: 3,
    startY: 3,
  };
}

function createDepth5Map(): DepthMap {
  // Depth 5 - The Core (Engine)
  const width = 20;
  const height = 20;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  const carveFloor = (x: number, y: number, overrides: Partial<MapTile> = {}) => {
    tiles[y][x] = {
      type: "floor",
      passable: true,
      discovered: false,
      ...overrides,
    };
  };

  // Stairs up
  tiles[2][2] = { type: "stairsUp", passable: true, discovered: false };

  // Bio-mechanical corridors leading to center
  for (let x = 2; x < 18; x += 1) {
    carveFloor(x, 10, { encounterChance: 0.4 });
  }

  for (let y = 2; y < 18; y += 1) {
    carveFloor(10, y, { encounterChance: 0.4 });
  }

  // Side chambers with dangerous encounters
  carveFloor(5, 5, { encounterChance: 0.5 });
  carveFloor(6, 5, { itemId: "medkit" });
  carveFloor(5, 6, { itemId: "sedative" });

  carveFloor(15, 5, { encounterChance: 0.5 });
  carveFloor(15, 6, { itemId: "medkit" });

  // The Engine chamber center - final area
  carveFloor(9, 9);
  carveFloor(10, 9);
  carveFloor(11, 9);
  carveFloor(9, 10);
  carveFloor(10, 10, {
    interactionText: "The Engine. A massive biomechanical construct pulses with dark energy. This is where it ends.",
  });
  carveFloor(11, 10);
  carveFloor(9, 11);
  carveFloor(10, 11);
  carveFloor(11, 11);

  return {
    depth: 5,
    width,
    height,
    tiles,
    startX: 2,
    startY: 2,
  };
}

function createFallbackMap(depth: number): DepthMap {
  const width = 3;
  const height = 3;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: "wall" as TileType,
      passable: false,
    }))
  );

  tiles[1][1] = { type: "floor", passable: true };

  return {
    depth,
    width,
    height,
    tiles,
    startX: 1,
    startY: 1,
  };
}

export function getDepthMap(depth: number): DepthMap {
  switch (depth) {
    case 1:
      return createDepth1Map();
    case 2:
      return createDepth2Map();
    case 3:
      return createDepth3Map();
    case 4:
      return createDepth4Map();
    case 5:
      return createDepth5Map();
    default:
      return createFallbackMap(depth);
  }
}

export function getTile(
  map: DepthMap,
  x: number,
  y: number
): MapTile | undefined {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return undefined;
  }
  return map.tiles[y][x];
}

export function getCurrentDepthMap(state: GameState): DepthMap {
  return getDepthMap(state.location.depth);
}
