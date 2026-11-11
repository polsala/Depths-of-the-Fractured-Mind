import { Color, Fog, HemisphereLight, PointLight, SpotLight } from "three";
import type { Scene } from "three";
import type { DungeonPresentationSnapshot, QualityPreset } from "./types";
import { archivePracticalFixtures } from "./ArchiveLighting";
import type { ArchivePractical } from "./ArchiveLighting";

/** Local practical lamps; the ambient floor never erases route readability. */
export class LightingSystem {
  private readonly points: PointLight[] = [];
  private readonly intake: boolean;
  private readonly archive: boolean;
  private readonly archiveFixtures: ArchivePractical[] = [];
  private readonly archiveSlots: Array<{ light: PointLight; fixtureId: string; target: number }> = [];
  private archiveSelected: readonly ArchivePractical[] = [];
  private lastX = NaN;
  private lastY = NaN;
  private lastPower = false;
  private readonly fixtures = [
    { x: 8, y: 2.12, z: 24.9, color: 0xffcf93, intensity: 14, distance: 11 },
    { x: 11.8, y: 2.2, z: 28, color: 0xaacfc7, intensity: 14, distance: 11 },
    { x: 21.5, y: 2.16, z: 28, color: 0xc4e0d0, intensity: 19, distance: 13 },
    { x: 24, y: 2.16, z: 16, color: 0xb7d7cd, intensity: 21, distance: 14 },
    { x: 36, y: 2.12, z: 15.3, color: 0xf1c485, intensity: 15, distance: 11 },
    { x: 24, y: 2.16, z: 7.5, color: 0xbdd6cb, intensity: 20, distance: 13 },
  ];
  constructor(scene: Scene, snapshot: DungeonPresentationSnapshot, preset: QualityPreset) {
    this.intake = snapshot.map.layoutId === "depth1-intake-v1";
    this.archive = !!snapshot.map.environment;
    scene.background = new Color(0x111c1b);
    scene.fog = new Fog(0x152321, 13, this.intake ? 37 : 31);
    if (this.archive) { scene.background.setHex(0x211b17); scene.fog = new Fog(0x28221c, 16, 45); }
    const fill = this.archive ? new HemisphereLight(0xcbd6cd, 0x776551, 1.12) : new HemisphereLight(0xc2d4c5, 0x3a4136, 1.12);
    scene.add(fill);
    // Shader light count remains fixed while a composed pair of practical
    // sources is selected at committed grid boundaries, never each frame.
    for (let i = 0; i < (this.archive ? 4 : 2); i++) {
      const light = new PointLight(0xd2d8c1, this.archive ? 0 : 14, 13, 2); this.points.push(light); scene.add(light);
      if (this.archive) this.archiveSlots.push({ light, fixtureId: "", target: 0 });
    }
    if (this.archive) for (const room of snapshot.map.environment!.rooms)
      this.archiveFixtures.push(...archivePracticalFixtures(snapshot.map, room));
    if (this.intake) {
      const key = new SpotLight(0xf7ce94, 10, 10, Math.PI * 0.28, 0.85, 1.8);
      key.position.set(8, 2.4, 25.8); key.target.position.set(8, 1.2, 23.2);
      key.castShadow = preset === "high";
      key.shadow.mapSize.set(512, 512); key.shadow.bias = -0.001;
      scene.add(key, key.target);
    }
    this.update(snapshot, 1, true);
  }

  update(snapshot: DungeonPresentationSnapshot, dt = 1, reducedMotion = true): void {
    const power = snapshot.flags.intakePowerRestored === true;
    if (this.archive) {
      this.updateArchive(snapshot, dt, reducedMotion);
      return;
    }
    if (snapshot.location.x === this.lastX && snapshot.location.y === this.lastY && power === this.lastPower) return;
    this.lastX = snapshot.location.x; this.lastY = snapshot.location.y; this.lastPower = power;
    if (this.intake) {
      const x = snapshot.location.x * 2, z = snapshot.location.y * 2;
      const nearby = [...this.fixtures].sort((a, b) =>
        (a.x - x) ** 2 + (a.z - z) ** 2 - ((b.x - x) ** 2 + (b.z - z) ** 2));
      this.points.forEach((light, i) => {
        const fixture = nearby[i];
        light.position.set(fixture.x, fixture.y, fixture.z);
        light.color.set(power && fixture.z === 16 && fixture.x === 24 ? 0xe0d5b2 : fixture.color);
        light.intensity = fixture.intensity; light.distance = fixture.distance;
      });
    } else {
      this.points[0].position.set(snapshot.location.x * 2, 2.16, snapshot.location.y * 2);
      this.points[0].intensity = 22; this.points[0].distance = 17;
      this.points[1].position.set(snapshot.location.x * 2 + 2, 1.5, snapshot.location.y * 2 + 2);
      this.points[1].intensity = 4;
    }
  }

  private updateArchive(snapshot: DungeonPresentationSnapshot, dt: number, reducedMotion: boolean): void {
    if (snapshot.location.x !== this.lastX || snapshot.location.y !== this.lastY) {
      this.lastX = snapshot.location.x; this.lastY = snapshot.location.y;
      const x = this.lastX * 2, z = this.lastY * 2;
      const room = snapshot.map.environment!.rooms.find(candidate => this.lastX >= candidate.x && this.lastY >= candidate.y
        && this.lastX < candidate.x + candidate.width && this.lastY < candidate.y + candidate.height);
      // Keep the composed task/fill pair throughout a room. Distance-only
      // selection used to replace a task with a brighter lamp behind a wall.
      // In connecting corridors a small retention bias prevents an equal-
      // distance boundary from switching sources on consecutive legal steps.
      const score = (fixture: ArchivePractical) => (fixture.x - x) ** 2 + (fixture.z - z) ** 2
        - (this.archiveSlots.some(slot => slot.fixtureId === fixture.id && slot.target > 0) ? 4 : 0);
      const candidates = room ? this.archiveFixtures.filter(fixture => fixture.roomId === room.id) : this.archiveFixtures;
      this.archiveSelected = [...candidates].sort((a, b) =>
        score(a) - score(b) || a.id.localeCompare(b.id)).slice(0, 2);
      for (const slot of this.archiveSlots) slot.target = this.archiveSelected.find(fixture => fixture.id === slot.fixtureId)?.intensity ?? 0;
    }
    for (const fixture of this.archiveSelected) {
      if (this.archiveSlots.some(slot => slot.fixtureId === fixture.id)) continue;
      // A rapid sequence can outpace retiring slots. Wait until a slot is
      // dark rather than relocating a still-visible light. Retry on the next
      // existing render tick, without timers or presentation callbacks.
      if (reducedMotion) for (const slot of this.archiveSlots) if (slot.target === 0) slot.light.intensity = 0;
      const slot = [...this.archiveSlots].filter(slot => slot.target === 0 && slot.light.intensity < .01)[0];
      if (!slot) continue;
      // Four permanent shader slots permit the two visible sources to retire
      // in place. A fixture never jumps to a different location at full power.
      slot.fixtureId = fixture.id; slot.light.intensity = 0; slot.target = fixture.intensity;
      slot.light.position.set(fixture.x, fixture.y, fixture.z); slot.light.color.setHex(fixture.color); slot.light.distance = fixture.distance;
    }
    const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, dt) / .22);
    for (const slot of this.archiveSlots) {
      slot.light.intensity += (slot.target - slot.light.intensity) * blend;
      if (Math.abs(slot.light.intensity - slot.target) < .01) slot.light.intensity = slot.target;
    }
  }
}
