import { PerspectiveCamera } from "three";
import type { GameLocation } from "../../game/state";
import type { Facing } from "./types";

export const CELL_SIZE = 2;
export const EYE_HEIGHT = 1.6;
export const STEP_MS = 280;
export const TURN_MS = 220;
const YAW: Record<Facing, number> = { north: 0, east: -Math.PI / 2, south: Math.PI, west: Math.PI / 2 };
export const shortestAngle = (from: number, to: number): number => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export class CameraRig {
  readonly camera = new PerspectiveCamera(62, 4 / 3, 0.06, 100);
  private fromX = 0;
  private fromZ = 0;
  private fromYaw = 0;
  private targetX = 0;
  private targetZ = 0;
  private targetYaw = 0;
  private start = 0;
  private duration = 0;
  private depth = 0;
  moving = false;

  constructor(location: GameLocation) { this.snap(location); }

  snap(location: GameLocation): void {
    this.targetX = location.x * CELL_SIZE;
    this.targetZ = location.y * CELL_SIZE;
    this.targetYaw = YAW[location.direction ?? "north"];
    this.depth = location.depth;
    this.camera.position.set(this.targetX, EYE_HEIGHT, this.targetZ);
    this.camera.rotation.set(0, this.targetYaw, 0);
    this.moving = false;
    this.duration = 0;
  }

  transition(location: GameLocation, now: number, reducedMotion: boolean): void {
    if (reducedMotion && this.moving) { this.snap(location); return; }
    const x = location.x * CELL_SIZE, z = location.y * CELL_SIZE;
    const yaw = YAW[location.direction ?? "north"];
    if (x === this.targetX && z === this.targetZ && Math.abs(shortestAngle(this.targetYaw, yaw)) < 0.001) return;
    if (reducedMotion || location.depth !== this.depth || Math.abs(x - this.targetX) + Math.abs(z - this.targetZ) > CELL_SIZE + 0.01) {
      this.snap(location); return;
    }
    // The command queue only starts a transition once the previous one settled.
    // Sampling here also makes interruption/resizing safe for external restores.
    this.sample(now);
    this.fromX = this.camera.position.x;
    this.fromZ = this.camera.position.z;
    this.fromYaw = this.camera.rotation.y;
    this.targetX = x;
    this.targetZ = z;
    this.targetYaw = this.fromYaw + shortestAngle(this.fromYaw, yaw);
    this.start = now;
    this.duration = Math.abs(x - this.fromX) + Math.abs(z - this.fromZ) > 0.01 ? STEP_MS : TURN_MS;
    this.moving = true;
  }

  sample(now: number): boolean {
    if (!this.moving) return false;
    const t = Math.max(0, Math.min(1, (now - this.start) / this.duration));
    const ease = t * t * (3 - 2 * t);
    this.camera.position.set(this.fromX + (this.targetX - this.fromX) * ease, EYE_HEIGHT,
      this.fromZ + (this.targetZ - this.fromZ) * ease);
    this.camera.rotation.set(0, this.fromYaw + (this.targetYaw - this.fromYaw) * ease, 0);
    if (t === 1) { this.moving = false; return true; }
    return false;
  }
}
