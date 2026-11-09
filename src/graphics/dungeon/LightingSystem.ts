import { Color, Fog, HemisphereLight, PointLight, SpotLight } from "three";
import type { Scene } from "three";
import type { DungeonPresentationSnapshot, QualityPreset } from "./types";

/** Local practical lamps; the ambient floor never erases route readability. */
export class LightingSystem {
  private readonly points: PointLight[] = [];
  private readonly intake: boolean;
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
    scene.background = new Color(0x111c1b);
    scene.fog = new Fog(0x152321, 13, this.intake ? 37 : 31);
    const fill = new HemisphereLight(0xc2d4c5, 0x3a4136, 1.12);
    scene.add(fill);
    // Shader light count remains fixed while the two nearest authored practical
    // sources are selected at committed grid boundaries, never each frame.
    for (let i = 0; i < 2; i++) { const light = new PointLight(0xd2d8c1, 14, 13, 2); this.points.push(light); scene.add(light); }
    if (this.intake) {
      const key = new SpotLight(0xf7ce94, 10, 10, Math.PI * 0.28, 0.85, 1.8);
      key.position.set(8, 2.4, 25.8); key.target.position.set(8, 1.2, 23.2);
      key.castShadow = preset === "high";
      key.shadow.mapSize.set(512, 512); key.shadow.bias = -0.001;
      scene.add(key, key.target);
    }
    this.update(snapshot);
  }

  update(snapshot: DungeonPresentationSnapshot): void {
    const power = snapshot.flags.intakePowerRestored === true;
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
}
