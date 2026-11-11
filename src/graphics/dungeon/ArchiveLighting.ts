import type { ArchiveRoom } from "../../game/exploration/generation/world-definition";
import type { DungeonWorldMap, ReadonlyWorld } from "./types";

type Room = ReadonlyWorld<ArchiveRoom>;
export interface ArchiveAnchor { x: number; z: number; ry: number }
export interface ArchivePractical {
  id: string; roomId: string; purpose: "primary" | "secondary";
  kind: "task" | "strip" | "security";
  x: number; y: number; z: number; ry: number;
  color: number; intensity: number; distance: number;
}

function wallBays(room: Room, side: "north" | "south" | "west" | "east") {
  const horizontal = side === "north" || side === "south";
  const start = horizontal ? room.x : room.y, length = horizontal ? room.width : room.height;
  const middle = start + Math.floor(length / 2);
  return Array.from({ length }, (_, index) => start + index).sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle) || a - b)
    .map(index => {
      if (side === "north") return { wallX: index, wallY: room.y - 1, x: index * 2, z: room.y * 2 - .63, ry: 0 };
      if (side === "south") return { wallX: index, wallY: room.y + room.height, x: index * 2, z: (room.y + room.height - 1) * 2 + .63, ry: Math.PI };
      if (side === "west") return { wallX: room.x - 1, wallY: index, x: room.x * 2 - .63, z: index * 2, ry: Math.PI / 2 };
      return { wallX: room.x + room.width, wallY: index, x: (room.x + room.width - 1) * 2 + .63, z: index * 2, ry: -Math.PI / 2 };
    });
}

function closedAnchor(map: DungeonWorldMap, room: Room, sides: ("north" | "south" | "west" | "east")[]): ArchiveAnchor {
  const bays = sides.map(side => wallBays(room, side));
  // Preserve a centered focal point where available, then find the nearest
  // intact bay. A locked door is never mistaken for a wall or dressed over.
  const anchor = [...bays.map(side => side[0]), ...bays.flatMap(side => side.slice(1))]
    .find(candidate => map.tiles[candidate.wallY]?.[candidate.wallX]?.type === "wall");
  if (!anchor) throw new Error(`Archive room ${room.id} has no closed architectural bay`);
  return { x: anchor.x, z: anchor.z, ry: anchor.ry };
}

/** Presentation-only adapters. Saved sockets and the authoritative map never
 * change when art direction changes. Architecture and light use the same source. */
export function archiveStationAnchor(map: DungeonWorldMap, room: Room): ArchiveAnchor {
  return closedAnchor(map, room, ["north", "south", "west", "east"]);
}

export function galleryFocusAnchor(map: DungeonWorldMap, room: Room): ArchiveAnchor {
  return closedAnchor(map, room, room.width > room.height ? ["east", "west"] : ["north", "south"]);
}

/** Two composed sources per room, selected through four permanent shader slots.
 * Warm task light identifies human work; cooler fill describes enclosing steel.
 * All variation derives from existing metadata, without RNG or mutable caches. */
export function archivePracticalFixtures(map: DungeonWorldMap, room: Room): readonly ArchivePractical[] {
  const socket = room.lightingSockets[0];
  const cx = socket ? socket.x * 2 : (room.x + (room.width - 1) / 2) * 2;
  const cz = socket ? socket.y * 2 : (room.y + (room.height - 1) / 2) * 2;
  const common = { roomId: room.id, distance: 12 };
  const secondary: ArchivePractical = { ...common, id: `${room.id}-architectural`, purpose: "secondary", kind: "strip",
    x: cx, y: room.archetype === "filing-gallery" || room.archetype === "compressed-aisle" ? 3.12 : 2.42,
    z: cz, ry: room.width > room.height ? Math.PI / 2 : 0,
    color: 0xb8d1cb, intensity: room.materialRole === "service" ? 9 : 11 };
  if (room.archetype === "drum-chamber") return [
    { ...common, id: `${room.id}-missing-segment`, purpose: "primary", kind: "task",
      x: cx + 1.2, y: 3.3, z: cz + 1.6, ry: 0, color: 0xffd9a0, intensity: 13, distance: 14 },
    { ...secondary, x: cx - 1.1, y: 3.6, z: cz - 1.3, intensity: 12, distance: 15 },
  ];
  const gallery = room.archetype === "filing-gallery" || room.archetype === "compressed-aisle";
  const anchor = gallery ? galleryFocusAnchor(map, room) : archiveStationAnchor(map, room);
  const offset = gallery ? 1.15 : .8, lateral = gallery ? 0 : -.7;
  const primary: ArchivePractical = { ...common, id: `${room.id}-task-focus`, purpose: "primary",
    kind: room.materialRole === "restricted" ? "security" : "task",
    x: anchor.x + Math.sin(anchor.ry) * offset + Math.cos(anchor.ry) * lateral, y: gallery ? 2.95 : 2.24,
    z: anchor.z + Math.cos(anchor.ry) * offset - Math.sin(anchor.ry) * lateral, ry: anchor.ry,
    color: room.archetype === "secret" ? 0xe1cfa3 : 0xffdda7,
    intensity: gallery ? 8.5 : room.archetype === "restricted-evidence" ? 5 : room.archetype === "secret" ? 4 : 4.2,
    distance: gallery ? 13 : 10 };
  return [primary, secondary];
}
