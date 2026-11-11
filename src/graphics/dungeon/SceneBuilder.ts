import { BoxGeometry, BufferGeometry, CanvasTexture, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Scene, Shape, SphereGeometry, SRGBColorSpace, StaticDrawUsage } from "three";
import type { Camera, Material } from "three";
import { MaterialLibrary } from "./MaterialLibrary";
import type { MaterialRole } from "./MaterialLibrary";
import { LightingSystem } from "./LightingSystem";
import { WorldSpriteSystem } from "./WorldSpriteSystem";
import { RenderAssetManager } from "./RenderAssetManager";
import type { DungeonPresentationSnapshot, QualityPreset } from "./types";
import { ArchiveRoomRenderer, archiveCeiling, archiveDoorOrientation, archiveDrumCell, archiveRoomAt, archiveShelfCell } from "./ArchiveRoomRenderer";

interface Batch { geometry: BufferGeometry; material: Material; transforms: Matrix4[]; name: string }

/** Static architecture is built once per depth; only named moving parts update. */
export class SceneBuilder {
  readonly scene = new Scene();
  readonly materials!: MaterialLibrary;
  readonly lighting!: LightingSystem;
  readonly sprites!: WorldSpriteSystem;
  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly cylinderGeometry = new CylinderGeometry(1, 1, 1, 10);
  private readonly planeGeometry = new PlaneGeometry(1, 1);
  private readonly batches = new Map<string, Batch>();
  private readonly extraMaterials = new Set<Material>();
  private readonly extraGeometries = new Set<BufferGeometry>();
  private readonly dynamicDoors: { group: Group; x: number; y: number; open: number }[] = [];
  private readonly fans: Group[] = [];
  private counterReleased: Mesh | null = null;
  private relayNeedle: Mesh | null = null;
  private disposed = false;
  private lastElapsed = 0;
  private onwardCover: Mesh | null = null;
  private powerIsolatedNotice: Mesh | null = null;
  private powerRestoredNotice: Mesh | null = null;

  constructor(snapshot: DungeonPresentationSnapshot, assets: RenderAssetManager, preset: QualityPreset) {
    try {
      this.materials = new MaterialLibrary(assets, snapshot.map.depth, !!snapshot.map.environment);
      this.lighting = new LightingSystem(this.scene, snapshot, preset);
      this.buildArchitecture(snapshot);
      if (snapshot.map.layoutId === "depth1-intake-v1") {
        const details = this.buildIntake(assets);
        this.counterReleased = details.counterReleased;
        this.relayNeedle = details.relayNeedle;
      }
      if (snapshot.map.environment) new ArchiveRoomRenderer({
        box: this.box.bind(this), rod: this.rod.bind(this), sign: this.sign.bind(this),
        geometry: (geometry) => { this.extraGeometries.add(geometry); return geometry; },
        instance: (geometry, role, x, y, z, sx, sy, sz, ry = 0) => this.batch(geometry, this.materials.get(role), x, y, z, sx, sy, sz, 0, ry),
      }, snapshot.map);
      this.flushBatches();
      this.sprites = new WorldSpriteSystem(this.scene, snapshot, assets);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  private batch(geometry: BufferGeometry, material: Material, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0, name = "architecture"): void {
    const key = `${geometry.uuid}:${material.uuid}`;
    let batch = this.batches.get(key);
    if (!batch) { batch = { geometry, material, transforms: [], name }; this.batches.set(key, batch); }
    const object = new Object3D();
    object.position.set(x, y, z); object.scale.set(sx, sy, sz); object.rotation.set(rx, ry, rz); object.updateMatrix();
    batch.transforms.push(object.matrix.clone());
  }

  private box(role: MaterialRole, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0): void {
    this.batch(this.boxGeometry, this.materials.get(role), x, y, z, w, h, d, 0, ry);
  }

  private rod(role: MaterialRole, x: number, y: number, z: number, radius: number, length: number, rx = 0, rz = 0): void {
    this.batch(this.cylinderGeometry, this.materials.get(role), x, y, z, radius, length, radius, rx, 0, rz, "pipework");
  }

  private sign(text: string, x: number, y: number, z: number, w: number, h: number, ry = 0,
    options: Parameters<MaterialLibrary["sign"]>[1] = {}): Mesh {
    const mesh = new Mesh(this.planeGeometry, this.materials.sign(text, options));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, 1); mesh.rotation.y = ry;
    mesh.name = `sign:${text}`; this.scene.add(mesh); return mesh;
  }

  private flushBatches(): void {
    for (const batch of this.batches.values()) {
      const mesh = new InstancedMesh(batch.geometry, batch.material, batch.transforms.length);
      mesh.name = `${batch.name}:${batch.material.name}`;
      mesh.instanceMatrix.setUsage(StaticDrawUsage);
      for (let i = 0; i < batch.transforms.length; i++) mesh.setMatrixAt(i, batch.transforms[i]);
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      mesh.castShadow = false; mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    this.batches.clear();
  }

  private buildArchitecture(snapshot: DungeonPresentationSnapshot): void {
    const { map } = snapshot;
    const solid = (x: number, y: number) => !map.tiles[y]?.[x]?.passable;
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      const drumCell = archiveDrumCell(map, x, y);
      const shelfCell = archiveShelfCell(map, x, y);
      if (!tile.passable && !drumCell && !shelfCell) continue;
      const px = x * 2, pz = y * 2;
      const ceiling = map.environment ? archiveCeiling(archiveRoomAt(map, x, y)) : 2.8;
      if (map.layoutId === "depth1-intake-v1" && tile.featureId === "intake-onward") {
        this.buildStairs(px, pz, false);
        this.onwardCover = new Mesh(this.boxGeometry, this.materials.get("trim"));
        this.onwardCover.position.set(px, -0.035, pz); this.onwardCover.scale.set(1.73, 0.07, 1.92);
        this.onwardCover.name = "sealed-descent-hatch"; this.scene.add(this.onwardCover);
      } else if (tile.type === "stairsDown" || tile.type === "stairsUp") this.buildStairs(px, pz, tile.type === "stairsUp");
      else this.box("floor", px, -0.055, pz, 2.001, 0.11, 2.001);
      this.box("ceiling", px, ceiling + .08, pz, 2.001, 0.16, 2.001);
      if (drumCell || shelfCell) continue;
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        if (!solid(x + dx, y + dz)) continue;
        if (archiveDrumCell(map, x + dx, y + dz)) continue;
        if (archiveShelfCell(map, x + dx, y + dz)) continue;
        const wx = px + dx, wz = pz + dz;
        const rotation = dx ? Math.PI / 2 : 0;
        this.box("wall", wx, ceiling / 2, wz, 2.02, ceiling, 0.18, rotation);
        this.box("enamel", wx - dx * 0.105, 0.55, wz - dz * 0.105, 1.98, 1.04, 0.045, rotation);
        this.box("trim", wx - dx * 0.145, 0.09, wz - dz * 0.145, 2, 0.14, 0.08, rotation);
        this.box("steel", wx - dx * 0.125, 1.08, wz - dz * 0.125, 2, 0.055, 0.06, rotation);
        this.box("trim", wx - dx * 0.13, ceiling - .12, wz - dz * 0.13, 2, 0.13, 0.11, rotation);
        // Vertical wall-bay seams have dimensional returns, not painted fake perspective.
        this.box("trim", wx - dx * 0.13 + (dz ? 0.96 : 0), 1.88, wz - dz * 0.13 + (dx ? 0.96 : 0), 0.065, 1.48, 0.13, rotation);
      }
      if (tile.type === "door") this.buildDoor(px, pz, x, y, !!tile.locked,
        map.environment ? archiveDoorOrientation(map, x, y) : 0, !!map.environment);
      // A ceiling module every four metres establishes a readable receding rhythm.
      const corridor = solid(x - 1, y) && solid(x + 1, y);
      const eastWestCorridor = solid(x, y - 1) && solid(x, y + 1);
      if (corridor && y % 2 === 0) {
        this.box("trim", px, 2.58, pz, 1.86, 0.24, 0.2);
        this.box("dark", px, 2.74, pz - 0.1, 0.86, 0.1, 0.28);
        this.box("light", px, 2.68, pz - 0.1, 0.72, 0.035, 0.2);
      } else if (eastWestCorridor && x % 2 === 0) {
        this.box("trim", px, 2.58, pz, 0.2, 0.24, 1.86);
        this.box("dark", px - 0.1, 2.74, pz, 0.28, 0.1, 0.86);
        this.box("light", px - 0.1, 2.68, pz, 0.2, 0.035, 0.72);
      }
    }
  }

  private buildDoor(px: number, pz: number, x: number, y: number, locked: boolean, ry = 0, archive = false): void {
    const frame = (role: MaterialRole, ox: number, oy: number, oz: number, w: number, h: number, d: number) =>
      this.box(role, px + Math.cos(ry) * ox + Math.sin(ry) * oz, oy, pz - Math.sin(ry) * ox + Math.cos(ry) * oz, w, h, d, ry);
    frame("trim", -0.9, 1.25, 0, 0.19, 2.5, 0.3);
    frame("trim", 0.9, 1.25, 0, 0.19, 2.5, 0.3);
    frame("steel", 0, 2.47, 0, 1.98, 0.22, 0.37);
    for (const offset of [-0.77, 0.77]) frame("brass", offset, 1.13, 0.18, 0.055, 2.18, 0.025);
    const group = new Group(); group.position.set(px, locked ? 0 : 2.45, pz);
    group.rotation.y = ry;
    group.name = `door-leaf:${x},${y}`;
    const panel = new Mesh(this.boxGeometry, this.materials.get("enamel"));
    panel.scale.set(1.64, 2.3, 0.13); panel.position.y = 1.15; group.add(panel);
    const insert = new Mesh(this.boxGeometry, this.materials.get("dark"));
    insert.scale.set(0.72, 0.24, 0.025); insert.position.set(0, 1.67, 0.081); group.add(insert);
    for (const offset of [-0.22, 0, 0.22]) {
      const bar = new Mesh(this.boxGeometry, this.materials.get("steel"));
      bar.scale.set(0.035, 0.24, 0.04); bar.position.set(offset, 1.67, 0.1); group.add(bar);
    }
    const handle = new Mesh(this.boxGeometry, this.materials.get("steel"));
    handle.scale.set(0.45, 0.045, 0.09); handle.position.set(0.18, 1.04, 0.13); group.add(handle);
    this.scene.add(group); this.dynamicDoors.push({ group, x, y, open: locked ? 0 : 1 });
    this.sign(archive ? "INDEXED ACCESS" : "RELEASE / 01", px + Math.sin(ry) * .201, 2.59, pz + Math.cos(ry) * .201, 1.32, 0.18, ry,
      { width: 768, height: 96, fontSize: 43 });
  }

  private buildStairs(x: number, z: number, up: boolean): void {
    for (let i = 0; i < 6; i++) {
      const top = up ? i * 0.13 : -i * 0.13;
      this.box("wall", x, top - 0.11, z + 0.82 - i * 0.32, 1.72, 0.22, 0.35);
      this.box("brass", x, top + 0.008, z + 0.94 - i * 0.32, 1.72, 0.02, 0.025);
    }
    for (const side of [-0.86, 0.86]) {
      this.rod("steel", x + side, 0.48, z + 0.7, 0.025, 0.96);
      this.rod("steel", x + side, 0.48, z - 0.7, 0.025, 0.96);
      // Side-access gaps preserve every legal grid approach to the stair/hatch.
      // A continuous waist rail would intersect an east/west step at z.
      for (const end of [-0.525, 0.525]) this.rod("steel", x + side, 0.96, z + end, 0.025, 0.35, Math.PI / 2);
    }
  }

  private buildIntake(assets: RenderAssetManager): { counterReleased: Mesh; relayNeedle: Mesh } {
    // Admissions foreground: an imperfect but functional queue, leaving legal
    // tile centers clear. The missing section points toward the east passage.
    for (const x of [6.85, 9.15]) {
      for (const z of [25.5, 27.5, 29.5, 31.4]) {
        this.rod("dark", x, 0.055, z, 0.16, 0.08);
        this.rod("steel", x, 0.53, z, 0.035, 1.02);
        this.rod("brass", x, 1.05, z, 0.065, 0.045);
      }
      // Missing rail sections make 0.9m+ crossing gaps at the legal even-z
      // grid rows. Clearing only tile centers still lets movement ghost
      // through a continuous rail between those centers.
      for (const end of x < 8 ? [25.5, 27.5, 29.5, 31.4] : [25.5, 27.5, 29.5]) {
        this.rod("steel", x, 0.88, end - 0.475, 0.025, 0.95, Math.PI / 2);
      }
    }
    // Heavy wall counter with four physically recessed mechanical slots.
    const housingShape = new Shape();
    housingShape.moveTo(-1.97, -0.88); housingShape.lineTo(1.97, -0.88);
    housingShape.lineTo(2.05, -0.8); housingShape.lineTo(2.05, 0.8);
    housingShape.lineTo(1.97, 0.88); housingShape.lineTo(-1.97, 0.88);
    housingShape.lineTo(-2.05, 0.8); housingShape.lineTo(-2.05, -0.8); housingShape.closePath();
    const housingGeometry = new ExtrudeGeometry(housingShape, { depth: 0.28, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 });
    this.extraGeometries.add(housingGeometry);
    const housing = new Mesh(housingGeometry, this.materials.get("trim"));
    housing.position.set(8, 1.56, 23.01); housing.name = "admissions-counter-housing"; this.scene.add(housing);
    this.box("enamel", 8, 1.52, 23.32, 3.94, 1.55, 0.12);
    this.box("steel", 8, 2.48, 23.32, 4.35, 0.085, 0.26);
    for (const x of [6.11, 9.89]) for (const y of [0.82, 2.31]) this.rod("steel", x, y, 23.39, 0.037, 0.03, Math.PI / 2);
    this.sign("ADMISSIONS", 8, 2.2, 23.405, 3.5, 0.32, 0, { background: "#233731", color: "#e5d9b7", fontSize: 76 });
    this.sign("THE FACILITY  /  INTAKE CONTROL", 8, 2.59, 23.39, 3.8, 0.18, 0,
      { width: 1024, height: 96, fontSize: 39, background: "#182a28" });
    for (let i = 0; i < 4; i++) {
      const x = 6.56 + i * 0.96;
      this.box("dark", x, 1.62, 23.42, 0.8, 0.54, 0.1);
      this.box("brass", x, 1.62, 23.475, 0.84, 0.59, 0.035);
      this.sign(String(i + 1).padStart(2, "0"), x, 1.66, 23.502, 0.68, 0.37, 0,
        { width: 192, height: 128, fontSize: 93, background: "#152320", color: "#d8cb9b" });
      this.box("dark", x, 1.35, 23.503, 0.68, 0.035, 0.025);
    }
    this.sign("ARRIVED  04     /     RELEASED  00", 8, 1.02, 23.425, 3.44, 0.23, 0,
      { width: 1024, height: 96, fontSize: 43, background: "#172825" });
    const counterReleased = this.sign("RELEASED  01  /  MARA VOSS", 8, 1.02, 23.43, 3.44, 0.23, 0,
      { width: 1024, height: 96, fontSize: 43, background: "#384f3b", color: "#f3d699" });
    counterReleased.visible = false;
    // Desk, worn edge, pigeonholes, admission slips and the bell. Each part has
    // a former function and is kept below the eye/sightline.
    this.box("enamel", 8, 0.46, 23.32, 3.5, 0.87, 0.56);
    this.box("dark", 8, 0.09, 23.34, 3.57, 0.17, 0.58);
    this.box("steel", 8, 0.94, 23.35, 3.72, 0.09, 0.72);
    for (const x of [6.62, 7.52, 8.42, 9.32]) {
      this.box("dark", x, 0.59, 23.61, 0.62, 0.12, 0.025);
      this.box("brass", x, 0.57, 23.632, 0.22, 0.035, 0.03);
    }
    this.box("paper", 8.62, 1.003, 23.47, 0.31, 0.008, 0.24, 0.17);
    this.box("paper", 8.68, 1.014, 23.46, 0.3, 0.008, 0.23, 0.08);
    this.rod("dark", 7.05, 1.01, 23.55, 0.13, 0.045);
    this.rod("brass", 7.05, 1.065, 23.55, 0.1, 0.08);
    this.rod("brass", 7.05, 1.12, 23.55, 0.02, 0.045);
    this.sign("RING ONCE. WAIT TO BE CALLED.", 8, 0.36, 23.624, 2.2, 0.14, 0,
      { width: 1024, height: 96, fontSize: 39 });
    // Counter practical: recessed lamp, protective cage and visible conduit.
    this.box("dark", 8, 2.69, 23.68, 2.8, 0.13, 0.4);
    this.box("warmLight", 8, 2.61, 23.71, 2.48, 0.045, 0.18);
    for (const x of [6.9, 7.45, 8, 8.55, 9.1]) this.box("steel", x, 2.6, 23.71, 0.025, 0.04, 0.26);
    // Observation window set into the west wall; layered bars and sill provide
    // actual occlusion and scale while the cold glass suggests a watcher.
    this.box("trim", 3.13, 1.62, 27.2, 0.2, 1.3, 2.7);
    this.box("glass", 3.25, 1.65, 27.2, 0.05, 1.08, 2.43);
    this.box("steel", 3.31, 1.09, 27.2, 0.28, 0.1, 2.82);
    for (const z of [26.3, 26.9, 27.5, 28.1]) this.box("trim", 3.34, 1.64, z, 0.05, 1.08, 0.035);
    this.sign("OBSERVATION", 3.36, 2.41, 27.2, 2, 0.2, Math.PI / 2, { fontSize: 54 });
    // Three institutional seats, attached to a single wall rail.
    this.box("steel", 3.35, 0.32, 31.4, 0.08, 0.08, 3.1);
    for (const z of [30.4, 31.4, 32.4]) {
      this.box("enamel", 3.37, 0.46, z, 0.58, 0.08, 0.72);
      this.box("enamel", 3.1, 0.83, z, 0.08, 0.72, 0.72);
      this.rod("steel", 3.35, 0.22, z, 0.032, 0.43);
    }
    // Ceiling service spine and bolted cross-beams frame the room's depth.
    for (const z of [25, 29, 33]) {
      this.box("trim", 8, 2.59, z, 9.7, 0.26, 0.24);
      for (const x of [4.2, 11.8]) {
        this.box("steel", x, 2.56, z + 0.13, 0.4, 0.08, 0.28);
        this.rod("dark", x, 2.5, z + 0.15, 0.045, 0.06);
      }
    }
    for (const x of [4.65, 5.03]) {
      this.rod("steel", x, 2.48, 28, 0.085, 9.8, Math.PI / 2);
      for (const z of [24, 28, 32]) this.box("trim", x, 2.46, z, 0.23, 0.09, 0.12);
    }
    this.box("dark", 10.5, 2.7, 29.4, 1.32, 0.12, 0.32);
    this.box("light", 10.5, 2.62, 29.4, 1.13, 0.04, 0.22);
    // Extraction fan, driven subtly with a fixed pivot, not screen-space noise.
    const fan = new Group(); fan.name = "admissions-extractor"; fan.position.set(12.77, 2.12, 25.2); fan.rotation.y = -Math.PI / 2;
    const fanBacking = new Mesh(this.boxGeometry, this.materials.get("dark"));
    fanBacking.scale.set(0.76, 0.76, 0.1); fan.add(fanBacking);
    const blades = new Group(); blades.name = "extractor-rotor"; blades.position.z = 0.071;
    for (let i = 0; i < 3; i++) {
      const blade = new Mesh(this.boxGeometry, this.materials.get("steel"));
      const angle = i * Math.PI * 2 / 3;
      blade.scale.set(0.12, 0.28, 0.02); blade.position.set(Math.sin(angle) * 0.14, Math.cos(angle) * 0.14, 0);
      blade.rotation.z = -angle; blades.add(blade);
    }
    fan.add(blades); this.scene.add(fan); this.fans.push(blades);
    // Repeated connector details: cable trough, protective skirting and a lost
    // wrist tag identify this as a queue-to-release journey rather than a maze.
    this.box("trim", 19, 2.52, 28.74, 10.2, 0.13, 0.24);
    this.rod("steel", 19, 2.42, 28.61, 0.055, 10.2, 0, Math.PI / 2);
    // This was a controlled patient queue, not an interchangeable service
    // corridor. A severed call circuit and the removed ward notice explain
    // why the admission count stopped while the release route stayed shut.
    this.box("trim", 23.03, 2.43, 28, 0.25, 0.34, 1.96);
    for (const z of [27.16, 28.84]) {
      this.box("trim", 23.03, 1.2, z, 0.25, 2.4, 0.18);
      this.box("brass", 22.886, 1.2, z, 0.025, 2.13, 0.055);
      this.box("steel", 22.88, 0.25, z, 0.035, 0.22, 0.12);
    }
    this.box("steel", 23.03, 0.009, 28, 0.2, 0.018, 1.7);
    this.box("trim", 24.82, 1.83, 28, 0.18, 0.86, 1.52);
    this.sign("QUEUE  /  01\n←  RELEASE", 24.716, 1.85, 28, 1.36, 0.65, -Math.PI / 2,
      { width: 640, height: 256, fontSize: 58, background: "#2a423d", color: "#e0dbc0" });
    this.sign("WAIT FOR YOUR NAME", 24.71, 1.32, 28, 1.36, 0.16, -Math.PI / 2,
      { width: 768, height: 96, fontSize: 39, background: "#756744", color: "#ede1bd" });
    this.box("trim", 19.6, 1.8, 28.81, 0.69, 0.73, 0.12);
    this.sign("PATIENT CALL\n013", 19.6, 1.81, 28.735, 0.6, 0.61, Math.PI,
      { width: 384, height: 384, fontSize: 78, background: "#24322d", color: "#c4be91" });
    this.box("dark", 19.6, 2.23, 28.78, 0.45, 0.15, 0.1);
    this.box("red", 19.6, 2.23, 28.716, 0.31, 0.075, 0.04);
    this.rod("steel", 21, 2.06, 28.78, 0.021, 1.85, 0, Math.PI / 2);
    this.rod("steel", 22.63, 2.06, 28.78, 0.021, 0.55, 0, Math.PI / 2);
    this.rod("brass", 21.93, 2.06, 28.78, 0.034, 0.08, 0, Math.PI / 2);
    this.rod("brass", 22.34, 2.06, 28.78, 0.034, 0.08, 0, Math.PI / 2);
    this.rod("dark", 22.04, 1.98, 28.78, 0.015, 0.2, 0, -0.42);
    this.rod("red", 22.27, 1.96, 28.78, 0.012, 0.23, 0, 0.36);
    // A cleaner rectangle, torn lower remnant and four screws preserve the
    // physical absence of a notice without filling the hall with decoration.
    this.box("paper", 17.7, 1.74, 27.16, 0.77, 0.91, 0.015);
    this.box("wall", 17.7, 1.77, 27.18, 0.73, 0.82, 0.02);
    this.box("paper", 17.61, 1.39, 27.198, 0.48, 0.095, 0.006, -0.08);
    for (const x of [17.36, 18.04]) for (const y of [1.34, 2.12]) this.rod("dark", x, y, 27.21, 0.018, 0.015, Math.PI / 2);
    this.box("trim", 13.02, 2.58, 28, 0.18, 0.24, 1.96);
    this.box("dark", 13.01, 2.33, 28, 0.12, 0.31, 1.6);
    this.box("steel", 13, 0.007, 28, 0.15, 0.014, 1.96);
    this.sign("RELEASE →", 12.94, 2.33, 28, 1.44, 0.27, -Math.PI / 2,
      { width: 640, height: 160, fontSize: 62 });
    this.sign("LOWER LEVEL\nRELEASE REQUIRED", 3.35, 1.85, 29.4, 1.5, 0.44, Math.PI / 2,
      { width: 640, height: 192, fontSize: 43, background: "#293c36" });
    this.box("trim", 11.4, 1.92, 23.13, 2.1, 0.59, 0.17);
    this.sign("RELEASE CONTROL →", 11.4, 2.02, 23.227, 1.96, 0.24, 0,
      { width: 768, height: 128, fontSize: 51, background: "#2a4240", color: "#c8ddd1" });
    this.powerIsolatedNotice = this.sign("POWER ISOLATED", 11.4, 1.76, 23.227, 1.96, 0.16, 0,
      { width: 768, height: 96, fontSize: 39, background: "#7c683e", color: "#ece0b8" });
    this.powerRestoredNotice = this.sign("CIRCUIT RESTORED", 11.4, 1.76, 23.227, 1.96, 0.16, 0,
      { width: 768, height: 96, fontSize: 39, background: "#314f40", color: "#ece0b8" });
    this.powerRestoredNotice.visible = false;
    this.sign("01  /  OBSERVATION", 24, 2.41, 19.08, 2.2, 0.28, 0, { fontSize: 47 });
    this.box("paper", 22.2, 0.016, 28.34, 0.13, 0.008, 0.25, 0.4);
    // Breaker cabinet. The meter needle follows a working relay; the door's
    // real locked state is applied in update, never inferred from light color.
    this.box("trim", 36, 1.46, 13.16, 1.13, 1.65, 0.31);
    this.box("enamel", 36, 1.46, 13.35, 0.99, 1.48, 0.1);
    this.sign("RELEASE CIRCUIT", 36, 2.09, 13.415, 0.85, 0.16, 0, { width: 640, height: 96, fontSize: 43 });
    this.sign("0       50       100", 36, 1.76, 13.417, 0.67, 0.23, 0,
      { width: 512, height: 192, fontSize: 36, background: "#b7b89d", color: "#1c2b27" });
    const relayNeedle = new Mesh(this.boxGeometry, this.materials.get("red"));
    relayNeedle.position.set(36, 1.74, 13.44); relayNeedle.scale.set(0.018, 0.13, 0.015); this.scene.add(relayNeedle);
    this.box("dark", 36, 1.12, 13.43, 0.16, 0.31, 0.08);
    this.box("brass", 36, 1.12, 13.53, 0.32, 0.055, 0.06);
    this.sign("ISOLATE BEFORE SERVICE", 36, 0.86, 13.42, 0.8, 0.13, 0,
      { width: 768, height: 96, fontSize: 38, background: "#7c683e" });
    this.rod("steel", 36.38, 2.46, 13.23, 0.025, 0.75);
    this.box("dark", 36, 2.72, 15.3, 1.2, 0.1, 0.3);
    this.box("warmLight", 36, 2.66, 15.3, 1.0, 0.035, 0.2);
    this.buildEvidenceWorker();
    this.sign("DO NOT DISCHARGE\nWITHOUT A NAME", 24, 1.83, 3.12, 2.1, 0.56, 0,
      { fontSize: 46, background: "#31423a" });
    this.box("dark", 24, 2.68, 7.5, 1.45, 0.12, 0.31);
    this.box("light", 24, 2.6, 7.5, 1.25, 0.04, 0.21);
    // Linen rack, folded garments and a handwritten name which rewards a
    // second look. Stays against the wall so it never occupies a legal center.
    for (const z of [23.25, 25.0]) this.box("steel", 36.88, 1.05, z, 0.055, 2.1, 0.055);
    for (const y of [0.26, 0.86, 1.46, 2.06]) this.box("trim", 36.65, y, 24.12, 0.58, 0.055, 1.86);
    for (const z of [23.6, 24.35, 24.7]) for (const y of [0.94, 1.54]) this.box("paper", 36.65, y, z, 0.48, 0.1, 0.43);
    this.sign("LINEN / RETURN ALL EFFECTS", 36.29, 2.35, 24.12, 1.6, 0.23, -Math.PI / 2, { fontSize: 42 });
    // Contact plates sit 12 mm above floor and are alpha blended in a single
    // batch. They anchor the desk, chairs and rails without a shadow-map pass.
    const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 64;
    const shadowCtx = shadowCanvas.getContext("2d")!;
    const gradient = shadowCtx.createRadialGradient(32, 32, 8, 32, 32, 32);
    gradient.addColorStop(0, "rgba(9,17,15,0.6)"); gradient.addColorStop(1, "rgba(9,17,15,0)");
    shadowCtx.fillStyle = gradient; shadowCtx.fillRect(0, 0, 64, 64);
    const shadowTexture = assets.ownTexture(new CanvasTexture(shadowCanvas)); shadowTexture.colorSpace = SRGBColorSpace;
    const shadowMaterial = new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    this.extraMaterials.add(shadowMaterial);
    for (const [x, z, w, d] of [[8, 24, 4, 1.5], [5.25, 29.5, 1.1, 0.6], [3.5, 31.4, 0.8, 3.3], [23.05, 4.4, 1.05, 2.05], [24.9, 4.65, 1.5, 1.25], [36.65, 24.1, 1.1, 2]]) {
      this.batch(this.planeGeometry, shadowMaterial, x, 0.012, z, w, d, 1, -Math.PI / 2, 0, 0, "contact-shadows");
    }
    return { counterReleased, relayNeedle };
  }

  private buildEvidenceWorker(): void {
    // The worker is an authored, covered human form rather than a generic
    // crate-shaped stand-in. The quiet face and open hand connect the visible
    // body to first_corpse's unwounded-face account without graphic injury.
    const sections = [
      [3.81, 0.14, 0.15], [3.97, 0.29, 0.22], [4.2, 0.27, 0.25],
      [4.46, 0.22, 0.2], [4.67, 0.25, 0.18], [4.91, 0.22, 0.16], [5.1, 0.17, 0.12],
    ];
    const positions: number[] = [], indices: number[] = [];
    const ringSize = 13;
    sections.forEach(([z, halfWidth, height], index) => {
      for (let point = 0; point < ringSize; point++) {
        const angle = Math.PI * point / (ringSize - 1);
        const fold = (point % 3 === 1 ? 0.009 : -0.003) * Math.sin(angle);
        positions.push(23.05 + Math.cos(angle) * halfWidth,
          0.025 + Math.sin(angle) * height + fold, z);
        if (index > 0 && point > 0) {
          const current = index * ringSize + point;
          indices.push(current - 1, current - ringSize, current,
            current - 1, current - ringSize - 1, current - ringSize);
        }
      }
    });
    const shroudGeometry = new BufferGeometry();
    shroudGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    shroudGeometry.setIndex(indices); shroudGeometry.computeVertexNormals();
    this.extraGeometries.add(shroudGeometry);
    const shroud = new Mesh(shroudGeometry, this.materials.get("cloth"));
    shroud.name = "worker-covered-body"; this.scene.add(shroud);
    const sphere = new SphereGeometry(1, 14, 10); this.extraGeometries.add(sphere);
    const form = (role: MaterialRole, name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number): Mesh => {
      const mesh = new Mesh(sphere, this.materials.get(role));
      mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); this.scene.add(mesh); return mesh;
    };
    form("skin", "worker-face", 23.05, 0.125, 3.62, 0.115, 0.105, 0.16);
    form("dark", "worker-hair", 23.05, 0.112, 3.51, 0.12, 0.09, 0.095);
    form("skin", "worker-nose", 23.05, 0.23, 3.63, 0.027, 0.023, 0.045);
    form("dark", "worker-left-boot", 22.94, 0.075, 5.22, 0.085, 0.07, 0.18);
    form("dark", "worker-right-boot", 23.16, 0.075, 5.2, 0.085, 0.07, 0.18);
    const sleeve = form("cloth", "worker-outstretched-sleeve", 23.37, 0.1, 4.09, 0.21, 0.09, 0.09);
    sleeve.rotation.y = -0.4;
    form("skin", "worker-open-hand", 23.58, 0.075, 4.17, 0.09, 0.035, 0.07);
    // A cream identity tag lies within the open fingers, at real prop scale.
    this.box("paper", 23.64, 0.045, 4.25, 0.105, 0.008, 0.17, 0.12);
    this.box("brass", 23.64, 0.052, 4.205, 0.052, 0.005, 0.018, 0.12);
    const chair = new Group(); chair.name = "overturned-admission-chair";
    chair.position.set(24.38, 0.27, 4.72); chair.rotation.set(0.03, 0.12, -Math.PI / 2);
    chair.scale.setScalar(0.8);
    const part = (role: MaterialRole, x: number, y: number, z: number, w: number, h: number, d: number): void => {
      const mesh = new Mesh(this.boxGeometry, this.materials.get(role));
      mesh.position.set(x, y, z); mesh.scale.set(w, h, d); chair.add(mesh);
    };
    part("enamel", 0, 0.47, 0, 0.64, 0.09, 0.65);
    part("enamel", 0, 0.92, -0.29, 0.64, 0.84, 0.08);
    part("steel", -0.35, 0.63, 0.02, 0.04, 0.04, 0.64);
    part("steel", 0.35, 0.63, 0.02, 0.04, 0.04, 0.64);
    for (const x of [-0.26, 0.26]) for (const z of [-0.25, 0.25]) part("steel", x, 0.23, z, 0.035, 0.46, 0.035);
    this.scene.add(chair);
    this.box("paper", 25.12, 0.018, 5.24, 0.31, 0.013, 0.25, -0.3);
  }

  update(snapshot: DungeonPresentationSnapshot, camera: Camera, elapsed: number, reducedMotion: boolean): void {
    const dt = Math.max(0, Math.min(0.1, elapsed - this.lastElapsed));
    this.lastElapsed = elapsed;
    this.lighting.update(snapshot, dt, reducedMotion);
    this.sprites.update(snapshot, camera, elapsed, reducedMotion);
    for (const door of this.dynamicDoors) {
      const open = !snapshot.map.tiles[door.y]?.[door.x]?.locked;
      const goal = open ? 1 : 0;
      door.open = reducedMotion ? goal : door.open + (goal - door.open) * (1 - Math.exp(-dt / 0.11));
      if (Math.abs(door.open - goal) < 0.001) door.open = goal;
      door.group.position.y = door.open * 2.45;
    }
    if (this.counterReleased) this.counterReleased.visible = snapshot.flags.intakeComplete === true;
    if (this.powerIsolatedNotice) this.powerIsolatedNotice.visible = snapshot.flags.intakePowerRestored !== true;
    if (this.powerRestoredNotice) this.powerRestoredNotice.visible = snapshot.flags.intakePowerRestored === true;
    if (this.onwardCover) this.onwardCover.visible = snapshot.flags.intakeComplete !== true;
    if (this.relayNeedle) this.relayNeedle.rotation.z = snapshot.flags.intakePowerRestored ? -0.65 : 0.65;
    for (const fan of this.fans) fan.rotation.z = reducedMotion ? 0 : elapsed * 0.6;
  }

  get materialCount(): number { return this.materials.materials.size + this.extraMaterials.size + this.sprites.materialCount; }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.sprites?.dispose();
    // InstancedMesh owns GPU instance attributes separately from its shared
    // geometry. Dispose those handles too, including on partial construction.
    const geometries = new Set<BufferGeometry>([this.boxGeometry, this.cylinderGeometry, this.planeGeometry, ...this.extraGeometries]);
    const materials = new Set<Material>([...(this.materials?.materials ?? []), ...this.extraMaterials]);
    this.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      if (object instanceof InstancedMesh) object.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.scene.clear();
  }
}
