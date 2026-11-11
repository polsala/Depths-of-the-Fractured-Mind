/** Serialized semantic identity. All coordinates are authoritative grid cells,
 * never Three.js resources. Visual sockets use fractional grid coordinates. */
export type ArchiveArchetype = "entrance" | "indexing" | "compressed-aisle" | "filing-gallery" | "drum-chamber" | "retrieval" | "restricted-evidence" | "damaged-storage" | "secret" | "exit";
export interface WorldPoint { x: number; y: number }
export interface ArchiveRoom {
  id: string;
  archetype: ArchiveArchetype;
  narrativeRole: string;
  purpose: string;
  formerUse: string;
  humanTrace: string;
  focalPoint: string;
  mainSightline: "north" | "south" | "east" | "west";
  mandatory: boolean;
  x: number; y: number; width: number; height: number;
  landmark?: "missing-records-drum";
  requiredEvents: string[];
  constraints: { clearCenter: boolean; entranceSides: string[] };
  style: "archive";
  materialRole: "records" | "service" | "restricted";
  decorationSeed: number;
  lightingSockets: Array<WorldPoint & { id: string; kind: "task" | "strip" | "security"; intensity: number; height: number }>;
  propSockets: Array<WorldPoint & { id: string; kind: "filing-bank" | "retrieval-desk" | "index-machine" | "evidence-cage" | "removed-files" | "records-drum" }>;
  featureRefs: Array<WorldPoint & { id: string }>;
}
export interface ArchiveEdge {
  id: string; from: string; to: string;
  type: "main" | "branch" | "loop" | "secret";
  traversal: "bidirectional";
  door?: { featureId: string; requires: "archive-index" };
  dependencies: string[];
  routing: "orthogonal-clearance";
  path: WorldPoint[];
}
export interface ArchiveEnvironment {
  schemaVersion: 1;
  generatorVersion: "archive-v1";
  seed: number;
  decorationSeed: number;
  attempt: number;
  rooms: ArchiveRoom[];
  edges: ArchiveEdge[];
  requiredFeatureIds: string[];
}
export interface GenerationPolicy { version: 1; runSeed: number }
