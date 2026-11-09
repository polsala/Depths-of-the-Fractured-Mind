import { describe, expect, it } from "vitest";
import { CameraRig, EYE_HEIGHT, STEP_MS, TURN_MS, shortestAngle } from "../src/graphics/dungeon/CameraRig";
import { ExplorationCommandQueue } from "../src/ui/exploration-commands";

describe("grid presentation timeline", () => {
  it("eases between committed cells without overshoot, bob or changing the source location", () => {
    const location = { x: 4, y: 15, depth: 1, direction: "north" as const };
    const rig = new CameraRig(location);
    const destination = { ...location, y: 14 };
    rig.transition(destination, 100, false);
    expect(rig.moving).toBe(true);
    rig.sample(100 + STEP_MS / 2);
    expect(rig.camera.position.z).toBeCloseTo(29);
    expect(rig.camera.position.y).toBe(EYE_HEIGHT);
    expect(location.y).toBe(15);
    expect(rig.sample(100 + STEP_MS)).toBe(true);
    expect(rig.camera.position.z).toBe(28);
    expect(rig.moving).toBe(false);
    expect(rig.sample(9999)).toBe(false);
  });

  it("takes a short 90-degree arc at the north/west seam and supports strafing/backing", () => {
    const rig = new CameraRig({ x: 4, y: 15, depth: 1, direction: "west" });
    rig.transition({ x: 4, y: 15, depth: 1, direction: "north" }, 0, false);
    rig.sample(TURN_MS / 2);
    expect(rig.camera.rotation.y).toBeCloseTo(Math.PI / 4);
    rig.sample(TURN_MS);
    rig.transition({ x: 5, y: 15, depth: 1, direction: "north" }, 300, false);
    rig.sample(300 + STEP_MS);
    expect(rig.camera.position.x).toBe(10);
    rig.transition({ x: 5, y: 16, depth: 1, direction: "north" }, 600, false);
    rig.sample(600 + STEP_MS);
    expect(rig.camera.position.z).toBe(32);
    expect(shortestAngle(-Math.PI, Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it("snaps reduced motion, depth changes, restores and active reduced-motion toggles", () => {
    const rig = new CameraRig({ x: 4, y: 15, depth: 1 });
    rig.transition({ x: 4, y: 14, depth: 1 }, 0, false);
    rig.transition({ x: 4, y: 14, depth: 1 }, 1, true);
    expect(rig.moving).toBe(false);
    expect(rig.camera.position.z).toBe(28);
    rig.transition({ x: 10, y: 10, depth: 2 }, 2, false);
    expect(rig.moving).toBe(false);
    expect(rig.camera.position.x).toBe(20);
  });

  it("queues one intent without duplicate commits and drops stale commands across a modal/mode boundary", () => {
    const queue = new ExplorationCommandQueue();
    const actions: string[] = [];
    const execute = (command: string) => actions.push(command);
    queue.request("forward", true, false, execute);
    queue.request("turnLeft", true, true, execute);
    queue.request("forward", true, true, execute);
    expect(actions).toEqual(["forward"]);
    queue.flush(true, false, execute);
    queue.flush(true, false, execute);
    expect(actions).toEqual(["forward", "turnLeft"]);
    queue.request("interact", true, true, execute);
    queue.flush(false, false, execute);
    queue.flush(true, false, execute);
    expect(actions).toEqual(["forward", "turnLeft"]);
  });
});
