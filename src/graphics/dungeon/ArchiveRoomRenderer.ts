import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from "three";
import type { MaterialRole, MaterialLibrary } from "./MaterialLibrary";
import type { DungeonWorldMap, ReadonlyWorld } from "./types";
import type { ArchiveRoom } from "../../game/exploration/generation/world-definition";

/** Static composition boundary. It has no game-state references, clock or RNG. */
export interface ArchitectureSink {
  box(role: MaterialRole, x: number, y: number, z: number, w: number, h: number, d: number, ry?: number): void;
  rod(role: MaterialRole, x: number, y: number, z: number, radius: number, length: number, rx?: number, rz?: number): void;
  sign(text: string, x: number, y: number, z: number, w: number, h: number, ry?: number, options?: Parameters<MaterialLibrary["sign"]>[1]): void;
  geometry(geometry: BufferGeometry): BufferGeometry;
  instance(geometry: BufferGeometry, role: MaterialRole, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry?: number): void;
}

type Room = ReadonlyWorld<ArchiveRoom>;
const TAU = Math.PI * 2;
export function archiveCeiling(room?: Pick<ArchiveRoom, "archetype">): number {
  return room?.archetype === "drum-chamber" ? 4.4 : room?.archetype === "filing-gallery" || room?.archetype === "compressed-aisle" ? 3.6 : 2.8;
}
export function archiveRoomAt(map: DungeonWorldMap, x: number, y: number): Room | undefined {
  return map.environment?.rooms.find(room => x >= room.x && y >= room.y && x < room.x + room.width && y < room.y + room.height);
}
export function archiveDrumCell(map: DungeonWorldMap, x: number, y: number): boolean {
  return map.environment?.rooms.some(room => room.propSockets.some(socket => socket.kind === "records-drum" && Math.abs(x - socket.x) <= 1 && Math.abs(y - socket.y) <= 1)) ?? false;
}
export function archiveShelfCell(map: DungeonWorldMap, x: number, y: number): boolean {
  return !!map.environment && !!map.tiles[y]?.[x]?.featureId?.startsWith("archive-shelving-");
}
export function archiveDoorOrientation(map: DungeonWorldMap, x: number, y: number): number {
  const featureId = map.tiles[y]?.[x]?.featureId;
  const edge = map.environment?.edges.find(candidate => candidate.door?.featureId === featureId);
  const index = edge?.path.findIndex(point => point.x === x && point.y === y) ?? -1;
  const approach = edge && index > 0 ? edge.path[index - 1] : undefined;
  return approach && approach.x !== x ? Math.PI / 2 : 0;
}

/** A shared architectural kit: chamfered enamel banks, index machinery,
 * service apertures, secure storage, retrieval stations and a segmented drum.
 * Every solid prop stays against a real wall or inside an authoritative solid
 * footprint; no cosmetic obstacle invents collision or blocks a legal step. */
export class ArchiveRoomRenderer {
  private readonly cabinet: BufferGeometry;
  private readonly kit: ArchitectureSink;
  private readonly map: DungeonWorldMap;
  constructor(kit: ArchitectureSink, map: DungeonWorldMap) {
    this.kit = kit; this.map = map;
    const face = new Shape();
    face.moveTo(-.5, -.47); face.lineTo(-.47, -.5); face.lineTo(.47, -.5); face.lineTo(.5, -.47);
    face.lineTo(.5, .47); face.lineTo(.47, .5); face.lineTo(-.47, .5); face.lineTo(-.5, .47); face.closePath();
    const cabinet = new ExtrudeGeometry(face, { depth: 1, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .012, bevelThickness: .012 });
    cabinet.translate(0, 0, -.5); this.cabinet = kit.geometry(cabinet);
    for (const room of map.environment?.rooms ?? []) this.room(room);
    this.shelvingIslands();
    this.corridorWayfinding();
    this.destinationLintels();
  }

  private shelvingIslands(): void {
    for (let y = 0; y < this.map.height; y++) for (let x = 0; x < this.map.width; x++) {
      if (!archiveShelfCell(this.map, x, y)) continue;
      const room = archiveRoomAt(this.map, x, y);
      if (!room || room.archetype !== "compressed-aisle") continue;
      const alongX = room.width > room.height;
      const rotation = alongX ? 0 : Math.PI / 2;
      for (const side of [-1, 1]) this.filingBank(x * 2 + (alongX ? 0 : side * .35), y * 2 + (alongX ? side * .35 : 0), rotation + (side > 0 ? 0 : Math.PI), true, false, x + y + room.decorationSeed % 31);
    }
  }

  private local(cx: number, cz: number, rotation: number, x: number, z: number): [number, number] {
    return [cx + Math.cos(rotation) * x + Math.sin(rotation) * z, cz - Math.sin(rotation) * x + Math.cos(rotation) * z];
  }
  private part(role: MaterialRole, cx: number, cz: number, ry: number, x: number, y: number, z: number, w: number, h: number, d: number): void {
    const [px, pz] = this.local(cx, cz, ry, x, z); this.kit.box(role, px, y, pz, w, h, d, ry);
  }
  private filingBank(x: number, z: number, ry: number, tall: boolean, missing = false, serial = 0): void {
    const k = this.kit, height = tall ? 3.05 : 2.32;
    k.instance(this.cabinet, "enamel", x, height / 2 + .08, z, 1.66, height, .58, ry);
    this.part("dark", x, z, ry, 0, .07, 0, 1.73, .14, .66);
    const count = tall ? 7 : 5, rowHeight = (height - .25) / count;
    for (let row = 0; row < count; row++) {
      const y = .24 + row * rowHeight;
      const removed = missing && row === 3;
      this.part(removed ? "dark" : "steel", x, z, ry, 0, y + rowHeight / 2, .31, 1.5, rowHeight - .045, .025);
      if (removed) {
        this.part("paper", x, z, ry, -.53, y + .06, .34, .14, .025, .12);
        continue;
      }
      this.part("enamel", x, z, ry, 0, y + rowHeight / 2, .332, 1.44, rowHeight - .09, .025);
      this.part("brass", x, z, ry, -.39, y + rowHeight / 2 + .035, .353, .28, .1, .018);
      this.part("paper", x, z, ry, -.39, y + rowHeight / 2 + .035, .366, .23, .057, .013);
      this.part("dark", x, z, ry, .19, y + rowHeight / 2, .352, .34, .085, .025);
      this.part("steel", x, z, ry, .19, y + rowHeight / 2 - .01, .385, .25, .022, .055);
    }
    this.part("trim", x, z, ry, 0, height + .1, .03, 1.78, .09, .73);
    // Index tabs use geometric marks shared across all bays, avoiding a unique
    // material/texture for every drawer and keeping a finite shader budget.
    for (let mark = 0; mark < 1 + serial % 3; mark++) this.part("paper", x, z, ry, -.43 + mark * .11, height - .02, .38, .06, .08, .012);
  }

  private room(room: Room): void {
    const k = this.kit, top = archiveCeiling(room), cx = (room.x + (room.width - 1) / 2) * 2;
    const cz = (room.y + (room.height - 1) / 2) * 2;
    const fileRoom = ["compressed-aisle", "filing-gallery", "damaged-storage", "secret"].includes(room.archetype);
    // One specific wall-run per room is authored for function; blank walls and
    // openings remain calm enough to frame the next destination.
    const solid = (x: number, y: number) => this.map.tiles[y]?.[x]?.type === "wall";
    const northBays: number[] = [];
    for (let x = room.x; x < room.x + room.width; x++) if (solid(x, room.y - 1)) northBays.push(x);
    if (fileRoom || room.archetype === "restricted-evidence" || room.archetype === "indexing") {
      let serial = room.decorationSeed % 97;
      for (let y = room.y; y < room.y + room.height; y++) {
        for (const side of [-1, 1]) {
          const x = side < 0 ? room.x : room.x + room.width - 1;
          if (!solid(x + side, y) || !this.map.tiles[y]?.[x]?.passable) continue;
          this.filingBank(x * 2 + side * .6, y * 2, side < 0 ? Math.PI / 2 : -Math.PI / 2,
            top > 3, room.archetype === "damaged-storage" && serial % 3 === 1 || room.archetype === "secret" && serial % 3 === 0, serial++);
        }
      }
    }
    // Raised service spines establish scale without intersecting the eye or
    // putting geometry across a legal grid travel line.
    for (let y = room.y; y < room.y + room.height; y += 2) {
      k.box("trim", cx, top - .17, y * 2, room.width * 2 - .13, .25, .2);
      for (const side of [-1, 1]) k.box("steel", cx + side * (room.width - .7), top - .31, y * 2, .26, .07, .3);
    }
    const titles: Record<ArchiveRoom["archetype"], string> = {
      entrance: "02 / ARCHIVE", indexing: "INDEX / RETRIEVAL AUTHORITY", "compressed-aisle": "ACTIVE RECORDS / 194–216",
      "filing-gallery": "FILING GALLERY / ORIGINALS", "drum-chamber": "CENTRAL RECORDS / RECONCILIATION",
      retrieval: "RECORDS RETRIEVAL", "restricted-evidence": "RESTRICTED / EVIDENCE", "damaged-storage": "OVERFLOW / SERVICE",
      secret: "MAINTENANCE ACCESS", exit: "WARD TRANSFER / 03",
    };
    const labelX = northBays.includes(Math.round(cx / 2)) ? cx : (northBays[0] ?? room.x) * 2;
    if (northBays.length) {
      k.sign(titles[room.archetype], labelX, Math.min(top - .45, 2.45), (room.y - .5) * 2 + .12, Math.min(3.8, room.width * 1.5), .29, 0,
        { background: "#2c231d", color: "#d3c6a4", width: 768, height: 96, fontSize: 38 });
    }
    for (const socket of room.lightingSockets) {
      const x = socket.x * 2, z = socket.y * 2, y = Math.min(socket.height, top - .16);
      k.box("dark", x, y + .08, z, socket.kind === "task" ? 1.2 : 1.7, .13, .32);
      k.box(socket.kind === "strip" ? "light" : "warmLight", x, y - .005, z, socket.kind === "task" ? 1 : 1.48, .035, .2);
      for (const offset of [-.43, .43]) k.box("steel", x + offset, y - .025, z, .026, .06, .28);
      k.rod("steel", x, (top + y) / 2 + .04, z, .017, Math.max(.08, top - y));
    }
    if (room.archetype === "entrance") this.transferStation(room, false);
    if (room.archetype === "exit") this.transferStation(room, true);
    if (room.archetype === "indexing") this.indexMachine(room);
    if (room.archetype === "retrieval") this.retrieval(room);
    if (room.archetype === "restricted-evidence") this.evidence(room);
    if (room.archetype === "damaged-storage") this.damage(room);
    if (room.archetype === "secret") this.maintenance(room);
    for (const socket of room.propSockets) if (socket.kind === "records-drum") this.drum(socket.x * 2, socket.y * 2);
    // A single interrupted task, rather than randomly distributed paper clutter.
    if (room.archetype === "filing-gallery") {
      const x = (room.x + room.width - 1) * 2 + .55, z = cz;
      const angle = (room.decorationSeed % 5 - 2) * .08;
      k.box("paper", x, .015, z + .3, .31, .012, .43, -.16 + angle);
      k.box("paper", x - .14, .023, z + .38, .27, .008, .37, .2 + angle);
    }
  }

  private wallAnchor(room: Room): { x: number; z: number; ry: number } {
    // Choose a real closed boundary, keeping front-facing surfaces in a visible
    // recess rather than replacing a routed entrance with a decorative prop.
    const x = room.x + Math.floor(room.width / 2), y = room.y + Math.floor(room.height / 2);
    if (!this.map.tiles[room.y - 1]?.[x]?.passable) return { x: x * 2, z: room.y * 2 - .63, ry: 0 };
    if (!this.map.tiles[room.y + room.height]?.[x]?.passable) return { x: x * 2, z: (room.y + room.height - 1) * 2 + .63, ry: Math.PI };
    return { x: room.x * 2 - .63, z: y * 2, ry: Math.PI / 2 };
  }
  private transferStation(room: Room, exit: boolean): void {
    const { x, z, ry } = this.wallAnchor(room), k = this.kit;
    this.part("trim", x, z, ry, 0, 1.12, 0, 3.1, 2.24, .22);
    this.part("enamel", x, z, ry, 0, 1.12, .13, 2.88, 2.06, .1);
    for (let slit = 0; slit < 5; slit++) this.part("dark", x, z, ry, -1.04 + slit * .52, 1.52, .195, .35, .13, .03);
    this.part("steel", x, z, ry, 0, .68, .29, 3.1, .08, .43);
    this.part("paper", x, z, ry, exit ? .77 : -.63, .74, .34, .34, .025, .28);
    const [lx, lz] = this.local(x, z, ry, 0, .202);
    k.sign(exit ? "WARD / SEALED TRANSFER" : "INTAKE / RECEIVED RECORDS", lx, 1.1, lz, 2.5, .25, ry,
      { width: 768, height: 96, fontSize: 35, background: "#4b6970", color: "#e2d4b2" });
  }
  private indexMachine(room: Room): void {
    const { x, z, ry } = this.wallAnchor(room), k = this.kit;
    this.part("dark", x, z, ry, 0, .09, 0, 2.65, .18, .6);
    k.instance(this.cabinet, "enamel", x, 1.03, z, 2.47, 1.88, .55, ry);
    for (let column = 0; column < 7; column++) {
      const missing = column === 3;
      this.part(missing ? "dark" : "paper", x, z, ry, (column - 3) * .32, 1.56, .3, .25, .37, .025);
      if (!missing) for (let line = 0; line < 4; line++) this.part("trim", x, z, ry, (column - 3) * .32, 1.47 + line * .06, .318, .17, .013, .012);
    }
    this.part("steel", x, z, ry, 0, .94, .31, 2.26, .16, .05);
    this.part("dark", x, z, ry, 0, .58, .31, 1.7, .23, .04);
    this.part("paper", x, z, ry, .4, .58, .34, .27, .17, .015);
    this.part("brass", x, z, ry, -.7, 1.02, .43, .23, .07, .14);
  }
  private retrieval(room: Room): void {
    const { x, z, ry } = this.wallAnchor(room);
    this.part("enamel", x, z, ry, 0, .45, 0, 2.8, .88, .56);
    this.part("dark", x, z, ry, 0, .08, 0, 2.88, .16, .6);
    this.part("steel", x, z, ry, 0, .94, .04, 3, .09, .7);
    this.part("trim", x, z, ry, -.46, 1.07, .06, .95, .18, .43);
    // A recognisable twin-spool tape reader, not a fantasy lectern.
    for (const ox of [-.7, -.24]) {
      const [px, pz] = this.local(x, z, ry, ox, .08);
      this.kit.rod("dark", px, 1.19, pz, .18, .035);
      this.kit.rod("steel", px, 1.215, pz, .065, .02);
    }
    this.part("paper", x, z, ry, .75, 1.01, .09, .47, .015, .36);
    this.part("paper", x, z, ry, .87, .91, .38, .24, .18, .01);
    this.part("brass", x, z, ry, -.7, .6, .32, .35, .07, .04);
  }
  private evidence(room: Room): void {
    const { x, z, ry } = this.wallAnchor(room);
    this.part("dark", x, z, ry, 0, 1.12, -.05, 3.4, 2.24, .14);
    for (const ox of [-1.72, 1.72]) this.part("steel", x, z, ry, ox, 1.17, .11, .13, 2.34, .24);
    for (const y of [.2, 1.03, 2.28]) this.part("steel", x, z, ry, 0, y, .11, 3.54, .075, .2);
    for (let bar = -7; bar <= 7; bar++) this.part("steel", x, z, ry, bar * .22, 1.17, .18, .024, 2.15, .024);
    for (let bundle = 0; bundle < 7; bundle++) this.part(bundle === 3 ? "dark" : "paper", x, z, ry, (bundle - 3) * .4, .64, .025, .31, .72, .12);
    this.part("brass", x, z, ry, .86, 1.24, .23, .28, .12, .055);
  }
  private damage(room: Room): void {
    const { x, z, ry } = this.wallAnchor(room);
    this.part("dark", x, z, ry, 0, .012, .13, 2.9, .02, .8);
    this.part("steel", x, z, ry, -1.24, .13, .04, .07, .24, .6);
    this.part("steel", x, z, ry, 1.24, .13, .04, .07, .24, .6);
    for (let beam = -3; beam <= 3; beam++) this.part("trim", x, z, ry, beam * .35, .03, .03, .16, .06, .64);
    this.part("brass", x, z, ry, -.82, 1.23, .07, .075, 2.44, .05);
    this.part("cloth", x, z, ry, -.77, .64, .17, .065, 1.2, .035);
    const crossing = room.featureRefs.find(feature => feature.id === "archive-broken-floor");
    if (crossing) {
      const fx = crossing.x * 2, fz = crossing.y * 2;
      // An interrupted service-floor seam marks the actual event tile. It is a
      // flush repair/rail plate, not a cosmetic open hole on walkable ground.
      this.kit.box("dark", fx, .008, fz, 1.6, .014, 1.42);
      for (const ox of [-.68, -.34, 0, .34, .68]) this.kit.box("steel", fx + ox, .024, fz, .14, .022, 1.38, ox === 0 ? .08 : 0);
      this.kit.box("brass", fx - .82, .027, fz, .055, .028, 1.56);
      this.kit.box("brass", fx + .82, .027, fz, .055, .028, 1.56);
      this.kit.box("cloth", fx + .8, .045, fz + .3, .075, .018, .72, .2);
    }
  }
  private maintenance(room: Room): void {
    const { x, z, ry } = this.wallAnchor(room);
    this.part("trim", x, z, ry, 0, 1.18, .02, 1.34, 1.74, .15);
    this.part("dark", x, z, ry, 0, 1.18, .11, 1.13, 1.53, .06);
    for (let grille = 0; grille < 8; grille++) this.part("steel", x, z, ry, 0, .54 + grille * .18, .16, 1.06, .048, .045);
    this.part("paper", x, z, ry, -.39, .37, .2, .2, .11, .13);
  }

  private drum(x: number, z: number): void {
    const k = this.kit, segments = 42, start = Math.PI / 4, length = Math.PI * 1.5;
    const plinth = k.geometry(new CylinderGeometry(2.8, 2.88, .16, 48));
    k.instance(plinth, "trim", x, .08, z, 1, 1, 1);
    // A thick open ring with a deliberately absent south quadrant. The void is
    // physical geometry; the missing original is legible before its text.
    const positions: number[] = [], indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = start + length * i / segments;
      for (const [radius, height] of [[2.25, 0], [2.25, 1], [1.9, 0], [1.9, 1]]) positions.push(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
      if (!i) continue;
      const p = (i - 1) * 4, q = i * 4;
      for (const [a, b, c, d] of [[p, q, p + 1, q + 1], [p + 2, p + 3, q + 2, q + 3], [p + 1, q + 1, p + 3, q + 3], [p, p + 2, q, q + 2]]) indices.push(a, b, c, b, d, c);
    }
    const ring = k.geometry(new BufferGeometry()); ring.setAttribute("position", new Float32BufferAttribute(positions, 3)); ring.setIndex(indices); ring.computeVertexNormals();
    k.instance(ring, "trim", x, .15, z, 1, .13, 1);
    k.instance(ring, "steel", x, 2.85, z, 1, .16, 1);
    for (let level = 0; level < 4; level++) k.instance(ring, "enamel", x, .34 + level * .6, z, 1, .1, 1);
    const body = k.geometry(new CylinderGeometry(.24, .32, 2.76, 12));
    k.instance(body, "steel", x, 1.45, z, 1, 1, 1);
    for (let segment = 0; segment <= 9; segment++) {
      const angle = start + length * segment / 9, px = x + Math.sin(angle) * 2.1, pz = z + Math.cos(angle) * 2.1;
      k.box("steel", px, 1.58, pz, .085, 2.58, .35, angle);
      if (segment < 9) {
        const a = angle + length / 18, sx = x + Math.sin(a) * 2.08, sz = z + Math.cos(a) * 2.08;
        for (let shelf = 0; shelf < 4; shelf++) {
          k.box("paper", sx, .59 + shelf * .6, sz, .8, .35, .29, a);
          k.box("brass", sx + Math.sin(a) * .17, .59 + shelf * .6, sz + Math.cos(a) * .17, .2, .08, .02, a);
          k.box("brass", sx - Math.sin(a) * .17, .59 + shelf * .6, sz - Math.cos(a) * .17, .2, .08, .02, a);
        }
      }
    }
    // The two cut faces and interrupted tracks make removal, not damage, the
    // salient fact. Warm trim belongs to the missing section's boundary only.
    for (const angle of [start, start + length]) {
      const dx = Math.sin(angle), dz = Math.cos(angle);
      k.box("steel", x + dx * 2.14, 1.61, z + dz * 2.14, .1, 2.62, .4, angle);
      k.box("brass", x + dx * 2.34, 1.61, z + dz * 2.34, .05, 2.62, .035, angle);
      k.box("steel", x + dx * 2.65, .11, z + dz * 2.65, .1, .08, .48, angle);
    }
    k.box("dark", x, .015, z + 1.8, 1.54, .025, 1.36);
    for (const sx of [-.66, .66]) k.box("brass", x + sx, .035, z + 1.8, .045, .025, 1.32);
    k.sign("ORIGINAL / 07", x + 1.35, 3.37, z - 2.1, 2.2, .35, 0,
      { width: 512, height: 96, fontSize: 47, background: "#2c231d", color: "#d2ad69" });
    // Suspended spider above the eye line frames the hollow central axis.
    for (const angle of [0, TAU / 3, TAU * 2 / 3]) k.box("trim", x + Math.sin(angle) * .9, 3.12, z + Math.cos(angle) * .9, .12, .15, 2.2, angle);
  }

  private corridorWayfinding(): void {
    const k = this.kit;
    // Thin flush floor tracks follow the actual routed graph; no random clutter
    // and no alternative gameplay graph. Missing segments never invent doors.
    const seen = new Set<string>();
    for (const edge of this.map.environment?.edges ?? []) for (const point of edge.path) {
      const key = `${point.x},${point.y}`;
      if (seen.has(key) || archiveRoomAt(this.map, point.x, point.y)) continue;
      seen.add(key);
      k.box(edge.type === "main" ? "brass" : "steel", point.x * 2 + .62, .008, point.y * 2, .055, .012, .72);
    }
  }

  private destinationLintels(): void {
    const rooms = this.map.environment?.rooms ?? [], seen = new Set<string>();
    const names: Record<ArchiveRoom["archetype"], string> = { entrance: "INTAKE TRANSFER", indexing: "INDEX",
      "compressed-aisle": "ACTIVE RECORDS", "filing-gallery": "FILING GALLERY", "drum-chamber": "CENTRAL DRUM",
      retrieval: "RETRIEVAL", "restricted-evidence": "RESTRICTED EVIDENCE", "damaged-storage": "SERVICE / OVERFLOW",
      secret: "MAINTENANCE", exit: "WARD TRANSFER" };
    const inside = (point: { x: number; y: number }, room: Room) => point.x >= room.x && point.y >= room.y && point.x < room.x + room.width && point.y < room.y + room.height;
    for (const edge of this.map.environment?.edges ?? []) {
      if (edge.type !== "main" && edge.type !== "loop") continue;
      const from = rooms.find(room => room.id === edge.from), to = rooms.find(room => room.id === edge.to);
      if (!from || !to) continue;
      for (const [origin, destination, path] of [[from, to, edge.path], [to, from, [...edge.path].reverse()]] as const) {
        const exit = path.findIndex((point, index) => index > 0 && !inside(point, origin) && inside(path[index - 1], origin));
        if (exit < 1) continue;
        const a = path[exit - 1], b = path[exit], dx = b.x - a.x, dz = b.y - a.y;
        const x = a.x + b.x, z = a.y + b.y, key = `${x},${z},${dx},${dz}`;
        if (seen.has(key)) continue; seen.add(key);
        const ry = dx < 0 ? Math.PI / 2 : dx > 0 ? -Math.PI / 2 : dz > 0 ? Math.PI : 0;
        const top = Math.min(archiveCeiling(origin), 2.8);
        this.kit.box("trim", x, top - .27, z, 1.93, .3, .2, ry);
        this.kit.sign(names[destination.archetype], x - dx * .12, top - .27, z - dz * .12, 1.72, .22, ry,
          { background: "#2c231d", color: "#e3d6b4", width: 512, height: 96, fontSize: 44, frontOnly: true });
      }
    }
  }
}
