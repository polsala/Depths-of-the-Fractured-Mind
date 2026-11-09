import type { DepthMap, MapTile } from "../map";

export const INTAKE_LAYOUT_ID = "depth1-intake-v1";

export const INTAKE_ROOMS = [
  { id: "admissions", name: "Admissions", x: 2, y: 12, width: 5, height: 5, purpose: "Orient, meet a witness, return a name" },
  { id: "queue", name: "The queue", x: 7, y: 14, width: 6, height: 1, purpose: "Anticipate the release shutter" },
  { id: "junction", name: "Observation junction", x: 10, y: 7, width: 5, height: 4, purpose: "Choose a visible route" },
  { id: "breaker", name: "Release control", x: 16, y: 7, width: 4, height: 3, purpose: "Restore the circuit" },
  { id: "linen", name: "Linen recess", x: 16, y: 11, width: 3, height: 3, purpose: "Reward a careful observation" },
  { id: "evidence", name: "Evidence bay", x: 10, y: 2, width: 5, height: 4, purpose: "Confront the first body and its guard" },
] as const;

export const INTAKE_FEATURES = {
  counter: { id: "intake-counter", x: 4, y: 11, label: "Read the patient counter" },
  keeper: { id: "intake-keeper", x: 3, y: 15, label: "Talk to the Keeper" },
  breaker: { id: "release-breaker", x: 18, y: 6, label: "Restore release power" },
  shutter: { id: "release-shutter", x: 12, y: 6, label: "Inspect the release shutter" },
  evidence: { id: "intake-evidence", x: 12, y: 3, label: "Examine the first body" },
  linen: { id: "linen-shelf", x: 18, y: 12, label: "Search the linen shelf" },
  perception: { id: "queue-shadow", x: 12, y: 11, label: "Listen to the queue echo" },
  onward: { id: "intake-onward", x: 2, y: 14, label: "Inspect the sealed descent" },
} as const;

/** Authored gameplay data only. Does not load art or consume the gameplay RNG. */
export function createIntakeMap(): DepthMap {
  const width = 22, height = 20;
  const tiles: MapTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ type: "wall", passable: false })));
  const floor = (x: number, y: number): void => {
    tiles[y][x] = { type: "floor", passable: true, discovered: false };
  };
  for (const room of INTAKE_ROOMS) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) floor(x, y);
    }
  }
  // Deliberate L-shaped connector, with the shutter visible only after the turn.
  for (let y = 10; y <= 14; y++) floor(12, y);
  floor(15, 8);
  for (let x = 14; x <= 16; x++) floor(x, 10);
  floor(16, 11);
  tiles[6][12] = { type: "door", passable: true, locked: true, discovered: true };
  for (const feature of Object.values(INTAKE_FEATURES)) tiles[feature.y][feature.x].featureId = feature.id;
  tiles[15][3].npcId = "keeper";
  tiles[15][3].discovered = true;
  tiles[15][4].discovered = true;
  return { depth: 1, layoutId: INTAKE_LAYOUT_ID, width, height, tiles, startX: 4, startY: 15 };
}

export function isIntakeMap(map: Pick<DepthMap, "layoutId"> | undefined): boolean {
  return map?.layoutId === INTAKE_LAYOUT_ID;
}
