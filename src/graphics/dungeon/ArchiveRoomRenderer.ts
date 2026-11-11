import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from "three";
import type { MaterialRole, MaterialLibrary } from "./MaterialLibrary";
import type { DungeonWorldMap, ReadonlyWorld } from "./types";
import type { ArchiveRoom } from "../../game/exploration/generation/world-definition";
import { archivePracticalFixtures, archiveStationAnchor, galleryFocusAnchor } from "./ArchiveLighting";

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
    const fileRoom = ["compressed-aisle", "damaged-storage", "secret"].includes(room.archetype);
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
    for (let y = room.y; room.archetype !== "filing-gallery" && y < room.y + room.height; y += 2) {
      k.box("trim", cx, top - .045, y * 2, room.width * 2 - .13, .09, .16);
      for (const side of [-1, 1]) k.box("steel", cx + side * (room.width - .7), top - .13, y * 2, .22, .07, .26);
    }
    const titles: Record<ArchiveRoom["archetype"], string> = {
      entrance: "02 / ARCHIVE", indexing: "INDEX / RETRIEVAL AUTHORITY", "compressed-aisle": "ACTIVE RECORDS / 194–216",
      "filing-gallery": "FILING GALLERY / ORIGINALS", "drum-chamber": "CENTRAL RECORDS / RECONCILIATION",
      retrieval: "RECORDS RETRIEVAL", "restricted-evidence": "RESTRICTED / EVIDENCE", "damaged-storage": "OVERFLOW / SERVICE",
      secret: "MAINTENANCE ACCESS", exit: "WARD TRANSFER / 03",
    };
    const labelX = northBays.includes(Math.round(cx / 2)) ? cx : (northBays[0] ?? room.x) * 2;
    if (northBays.length || top < 3) {
      // A real standoff plate sits in front of wall-bay returns. Quiet-room
      // labels clear the machinery; tall storage labels clear cabinet crowns.
      const servicePlate = room.archetype === "secret";
      const labelY = servicePlate ? 2.13 : Math.min(top - .22, top > 3 ? 3.27 : 2.55);
      const anchor = top < 3 ? archiveStationAnchor(this.map, room) : { x: labelX, z: (room.y - .5) * 2 + .34, ry: 0 };
      // The nameplate belongs to the station's overhead return, forward of its
      // task hood. Raising a wall label alone left it hidden in perspective.
      const [lx, lz] = this.local(anchor.x, anchor.z, anchor.ry, 0, servicePlate ? .23 : top < 3 ? 1.1 : 0);
      const labelWidth = servicePlate ? 2.2 : Math.min(3.8, room.width * 1.5);
      this.part("steel", lx, lz, anchor.ry, 0, labelY, -.035, labelWidth + .06, .34, .05);
      if (!servicePlate) for (const side of [-1, 1]) this.part("steel", anchor.x, anchor.z, anchor.ry, side * 1.36, labelY + .03, .55, .035, .035, 1.1);
      k.sign(titles[room.archetype], lx, labelY, lz, labelWidth, .29, anchor.ry,
        { background: "#2c231d", color: "#d3c6a4", width: 768, height: 96, fontSize: 38 });
    }
    for (const fixture of archivePracticalFixtures(this.map, room)) {
      const { x, z, ry } = fixture, y = fixture.y;
      const primary = fixture.purpose === "primary";
      k.box("dark", x, y + .10, z, primary ? .82 : 1.7, .12, .28, ry);
      k.box(fixture.kind === "strip" ? "light" : "warmLight", x, y, z, primary ? .7 : 1.48, .035, .2, ry);
      for (const offset of primary ? [-.31, .31] : [-.43, .43]) this.part("steel", x, z, ry, offset, y - .025, 0, .026, .06, .24);
      k.rod("steel", x, (top + y) / 2 + .04, z, .017, Math.max(.08, top - y));
    }
    if (room.archetype === "entrance") this.transferStation(room, false);
    if (room.archetype === "exit") this.transferStation(room, true);
    if (room.archetype === "indexing") this.indexMachine(room);
    if (room.archetype === "retrieval") this.retrieval(room);
    if (room.archetype === "restricted-evidence") this.evidence(room);
    if (room.archetype === "damaged-storage") this.damage(room);
    if (room.archetype === "secret") this.maintenance(room);
    if (room.archetype === "filing-gallery") this.gallery(room);
    for (const socket of room.propSockets) if (socket.kind === "records-drum") this.drum(socket.x * 2, socket.y * 2);
  }

  private wallAnchor(room: Room): { x: number; z: number; ry: number } {
    // Choose a real closed boundary, keeping front-facing surfaces in a visible
    // recess rather than replacing a routed entrance with a decorative prop.
    return archiveStationAnchor(this.map, room);
  }

  private gallery(room: Room): void {
    const k = this.kit, alongX = room.width > room.height, length = alongX ? room.width : room.height;
    const cx = (room.x + (room.width - 1) / 2) * 2, cz = (room.y + (room.height - 1) / 2) * 2;
    // Ranks run down the long walls, so the room reveals its scale through
    // foreground/middle/far layers from either real entrance. The short-wall
    // focal bay has a deliberately removed original, not a random empty slot.
    for (let bay = 0; bay < length; bay++) for (const side of [-1, 1]) {
      const tx = alongX ? room.x + bay : side < 0 ? room.x : room.x + room.width - 1;
      const ty = alongX ? side < 0 ? room.y : room.y + room.height - 1 : room.y + bay;
      const wallX = tx + (alongX ? 0 : side), wallY = ty + (alongX ? side : 0);
      if (this.map.tiles[wallY]?.[wallX]?.type !== "wall" || !this.map.tiles[ty]?.[tx]?.passable) continue;
      const serial = (room.decorationSeed + bay * 7 + (side + 1) * 3) >>> 0;
      const x = tx * 2 + (alongX ? 0 : side * .6), z = ty * 2 + (alongX ? side * .6 : 0);
      const ry = alongX ? side < 0 ? 0 : Math.PI : side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const interrupted = side > 0 && bay === Math.floor(length / 2);
      if (interrupted) {
        // A lower returned-file staging bench interrupts the vertical cadence
        // without intruding into the legal central route.
        this.part("trim", x, z, ry, 0, .48, 0, 1.68, .96, .6);
        this.part("steel", x, z, ry, 0, .99, .06, 1.8, .09, .72);
        for (let file = 0; file < 3; file++) this.part("paper", x, z, ry, -.45 + file * .31, 1.1 + file * .018, .04, .26, .12, .38);
        this.part("dark", x, z, ry, 0, 1.83, .06, 1.68, .92, .12);
        this.part("paper", x, z, ry, -.43, 1.83, .14, .46, .62, .025);
      } else this.filingBank(x, z, ry, serial % 5 !== 0, false, serial);
    }
    const focus = galleryFocusAnchor(this.map, room), { x, z, ry } = focus;
    this.filingBank(x, z, ry, true, true, room.decorationSeed % 97);
    // The withdrawal leaves a pale unaged mounting outline and one thin file
    // on the return lip. This trace survives grayscale and mobile viewing.
    this.part("paper", x, z, ry, -.83, 1.7, .33, .035, .51, .025);
    this.part("paper", x, z, ry, .83, 1.7, .33, .035, .51, .025);
    this.part("paper", x, z, ry, -.36, 1.47, .4, .5, .035, .18);
    const [px, pz] = this.local(x, z, ry, 0, 1.4);
    k.sign("07 / ORIGINAL WITHDRAWN", px, 3.34, pz, 2.52, .22, ry,
      { width: 768, height: 96, fontSize: 46, background: "#2c231d", color: "#d2ad69", frontOnly: true });
    // Two thin longitudinal retrieval rails and cross-ties replace a heavy
    // generic ceiling slab. They frame the far bay above the eye line.
    for (const side of [-1, 1]) k.box("steel", cx + (alongX ? 0 : side * 1.55), 3.39, cz + (alongX ? side * 1.55 : 0),
      alongX ? room.width * 2 - .3 : .075, .09, alongX ? .075 : room.height * 2 - .3);
    for (let bay = 0; bay < length; bay += 2) k.box("trim", alongX ? (room.x + bay) * 2 : cx, 3.48,
      alongX ? cz : (room.y + bay) * 2, alongX ? .15 : room.width * 2 - .2, .12, alongX ? room.height * 2 - .2 : .15);
  }

  private faceDisc(role: MaterialRole, x: number, z: number, ry: number, ox: number, y: number, oz: number, radius: number, depth: number): void {
    const [px, pz] = this.local(x, z, ry, ox, oz);
    this.kit.rod(role, px, y, pz, radius, depth, Math.abs(Math.sin(ry)) > .5 ? 0 : Math.PI / 2, Math.abs(Math.sin(ry)) > .5 ? Math.PI / 2 : 0);
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
    if (exit) {
      // Outbound station: sealed folios, empty addressee pocket, paired locks.
      for (const ox of [-.82, -.41, 0, .41]) {
        this.part("paper", x, z, ry, ox, .81, .25, .31, .15, .26);
        this.part("cloth", x, z, ry, ox, .9, .25, .065, .035, .29);
      }
      for (const ox of [-1.26, 1.26]) this.part("brass", x, z, ry, ox, 1.77, .22, .1, .19, .065);
      this.part("dark", x, z, ry, .78, 1.92, .23, .53, .18, .035);
      this.part("steel", x, z, ry, .78, 1.8, .26, .58, .035, .07);
    } else {
      // Inbound station: one cancelled consignment with its roller cradle left
      // open. The trolley silhouette lives entirely inside the wall recess.
      for (const ox of [-1.19, 1.19]) this.part("steel", x, z, ry, ox, .39, .35, .055, .6, .06);
      this.part("steel", x, z, ry, 0, .18, .34, 2.44, .07, .45);
      for (let roller = 0; roller < 7; roller++) this.part("steel", x, z, ry, -.98 + roller * .32, .7, .38, .075, .08, .36);
      this.part("paper", x, z, ry, -.61, .9, .32, .68, .32, .31);
      this.part("cloth", x, z, ry, -.61, .91, .49, .085, .36, .025);
      this.part("paper", x, z, ry, .74, 1.92, .22, .62, .23, .025);
      this.part("red", x, z, ry, .74, 1.92, .24, .44, .035, .013);
    }
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
    for (const ox of [-1.13, 1.13]) this.part("steel", x, z, ry, ox, 1.57, .34, .025, .54, .04);
    this.part("paper", x, z, ry, 0, 1.8, .34, .28, .025, .025);
    this.part("steel", x, z, ry, 0, 1.32, .34, .28, .025, .025);
    this.faceDisc("steel", x, z, ry, .84, 1.04, .38, .095, .07);
    this.faceDisc("dark", x, z, ry, .84, 1.04, .425, .052, .025);
    for (let vent = 0; vent < 6; vent++) this.part("dark", x, z, ry, -.78 + vent * .14, .3, .3, .075, .025, .025);
    // A thin printed access slip remains in the take-up rollers; its clean
    // absence band echoes the deliberately missing numbered index above.
    this.part("paper", x, z, ry, .4, .47, .36, .28, .32, .025);
    for (let line = 0; line < 5; line++) this.part("trim", x, z, ry, .4, .37 + line * .047, .378, .18, .009, .01);
  }
  private retrieval(room: Room): void {
    const { x, z, ry } = this.wallAnchor(room);
    this.part("enamel", x, z, ry, 0, .45, 0, 2.8, .88, .56);
    this.part("dark", x, z, ry, 0, .08, 0, 2.88, .16, .6);
    this.part("steel", x, z, ry, 0, .94, .04, 3, .09, .7);
    this.part("trim", x, z, ry, -.39, 1.4, .06, 1.45, .86, .25);
    this.part("enamel", x, z, ry, -.39, 1.4, .21, 1.34, .74, .065);
    // Upright reels expose their silhouettes to the actual 1.6m eye. The old
    // horizontal discs disappeared into the desk from a normal approach.
    for (const ox of [-.77, -.08]) {
      this.faceDisc("steel", x, z, ry, ox, 1.52, .29, .265, .05);
      this.faceDisc("dark", x, z, ry, ox, 1.52, .327, .218, .025);
      this.faceDisc("paper", x, z, ry, ox, 1.52, .348, .088, .02);
      this.part("steel", x, z, ry, ox, 1.52, .367, .35, .035, .018);
      this.part("steel", x, z, ry, ox, 1.52, .369, .035, .35, .018);
      this.faceDisc("brass", x, z, ry, ox, 1.52, .39, .036, .025);
    }
    this.part("cloth", x, z, ry, -.42, 1.3, .33, .7, .022, .015);
    for (const ox of [-.82, -.63, -.44, -.25]) this.part("steel", x, z, ry, ox, 1.12, .32, .08, .055, .07);
    // An interrupted transcription follows a real take-up roller into its
    // tray. Printed lines have a hierarchy rather than arbitrary paper litter.
    this.part("paper", x, z, ry, .76, 1.03, .1, .53, .025, .4);
    this.part("paper", x, z, ry, .88, .82, .4, .28, .38, .018);
    for (let line = 0; line < 6; line++) this.part("trim", x, z, ry, .88, .7 + line * .043, .414, line === 5 ? .1 : .2, .008, .01);
    this.part("steel", x, z, ry, .88, 1.06, .32, .35, .045, .08);
    this.part("dark", x, z, ry, .76, 1.55, .11, .4, .3, .08);
    this.part("paper", x, z, ry, .76, 1.55, .158, .3, .2, .015);
    this.part("trim", x, z, ry, .76, 1.55, .17, .23, .022, .015);
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
    this.part("brass", x, z, ry, -.82, 1.13, .07, .075, 2.24, .05);
    this.part("cloth", x, z, ry, -.77, .64, .17, .065, 1.2, .035);
    // One interrupted lift remains tensioned to the surviving wall, while a
    // displaced enamel inspection panel exposes the service mechanism.
    this.part("enamel", x, z, ry, .75, 1.33, -.04, .94, 1.16, .14);
    this.part("dark", x, z, ry, .75, 1.34, .06, .75, .95, .1);
    for (let rib = 0; rib < 6; rib++) this.part("steel", x, z, ry, .75, .98 + rib * .13, .13, .62, .04, .08);
    this.faceDisc("steel", x, z, ry, -.82, 2.13, .14, .16, .09);
    this.faceDisc("dark", x, z, ry, -.82, 2.13, .2, .1, .025);
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
    // Worker-scale maintenance: a removed panel rests in its wall cradle;
    // a folded medical packet and annotated service card explain the cache.
    this.part("enamel", x, z, ry, -.99, 1.18, .04, .42, 1.56, .08);
    this.part("steel", x, z, ry, -1.17, 1.18, .11, .04, 1.63, .05);
    this.part("paper", x, z, ry, -.39, .37, .2, .32, .16, .22);
    this.part("cloth", x, z, ry, -.39, .38, .32, .055, .17, .018);
    this.part("paper", x, z, ry, .86, 1.7, .09, .39, .52, .025);
    for (let line = 0; line < 5; line++) this.part("trim", x, z, ry, .86, 1.56 + line * .065, .107, .28, .012, .01);
    this.part("steel", x, z, ry, .86, 1.97, .1, .43, .05, .06);
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
    // The bearing remains physically grounded in the authoritative solid
    // centre, but its absent coupling leaves the viewing void genuinely open.
    // A full-height spindle previously hid the missing segment's silhouette.
    const body = k.geometry(new CylinderGeometry(.27, .38, .46, 16));
    k.instance(body, "steel", x, .4, z, 1, 1, 1);
    k.instance(body, "dark", x, 3.4, z, .75, 1.3, .75);
    k.rod("brass", x, .66, z, .13, .07);
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
    // The identifier is attached to the outside of the right cut face, never
    // hung across the void or behind the overhead carriage/records.
    // Flush to the exposed radial cut face, facing into the missing quadrant.
    // A floating front-facing board was either cropped or hidden by this face.
    const tagX = x + Math.sin(start) * 2.14 - .085, tagZ = z + Math.cos(start) * 2.14 + .085;
    k.box("dark", tagX, 2.32, tagZ, .38, .32, .025, -Math.PI / 4);
    k.sign("07\nWITHDRAWN", tagX - .013, 2.32, tagZ + .013, .36, .29, -Math.PI / 4,
      { width: 384, height: 160, fontSize: 52, background: "#2c231d", color: "#d2ad69", frontOnly: true });
    // Suspended spider above the eye line frames the hollow central axis.
    for (const angle of [0, TAU / 3, TAU * 2 / 3]) k.box("trim", x + Math.sin(angle) * .9, 3.65, z + Math.cos(angle) * .9, .10, .12, 2.2, angle);
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
