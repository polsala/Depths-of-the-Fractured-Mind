import { expect, it } from "vitest";
import { Box3, BoxGeometry, CylinderGeometry, Object3D, Vector3 } from "three";
import type { BufferGeometry } from "three";
import { ArchiveRoomRenderer } from "../src/graphics/dungeon/ArchiveRoomRenderer";
import type { ArchitectureSink } from "../src/graphics/dungeon/ArchiveRoomRenderer";
import { generateArchive } from "../src/game/exploration/generation/archive";
import { getRandomState, startRun } from "../src/game/random";

// Validate actual cosmetic bounds separately from authoritative connectivity:
// a map can be valid while a prop visibly intersects the legal grid camera.
it("keeps Archive architecture clear of every legal eye position over 100 fixed seeds", () => {
  const box = new BoxGeometry(1, 1, 1), rod = new CylinderGeometry(1, 1, 1, 10);
  const transform = new Object3D(), point = new Vector3();
  try {
    for (let index = 0; index < 100; index++) {
      const seed = index === 0 ? 130013 : (Math.imul(index + 1, 2654435761) >>> 0) || 1;
      startRun(seed);
      const map = generateArchive(seed), before = JSON.stringify(map), rng = getRandomState();
      const owned: BufferGeometry[] = [], violations: string[] = [];
      const check = (geometry: BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx=0, ry=0, rz=0) => {
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.rotation.set(rx, ry, rz); transform.updateMatrix();
        const bounds = new Box3().copy(geometry.boundingBox!).applyMatrix4(transform.matrix);
        if (bounds.max.y < 1.52 || bounds.min.y > 1.68) return;
        for (let cy = Math.ceil((bounds.min.z - .08) / 2); cy <= Math.floor((bounds.max.z + .08) / 2); cy++) {
          for (let cx = Math.ceil((bounds.min.x - .08) / 2); cx <= Math.floor((bounds.max.x + .08) / 2); cx++) {
            if (!map.tiles[cy]?.[cx]?.passable) continue;
            point.set(cx * 2, 1.6, cy * 2);
            if (bounds.distanceToPoint(point) < .08) violations.push(`seed ${seed}: eye ${cx},${cy}; prop ${x},${y},${z}`);
          }
        }
      };
      const sink: ArchitectureSink = {
        box: (_role,x,y,z,w,h,d,ry=0) => check(box,x,y,z,w,h,d,0,ry),
        rod: (_role,x,y,z,r,length,rx=0,rz=0) => check(rod,x,y,z,r,length,r,rx,0,rz),
        sign: () => {},
        geometry: geometry => { owned.push(geometry); return geometry; },
        instance: (geometry,_role,x,y,z,sx,sy,sz,ry=0) => check(geometry,x,y,z,sx,sy,sz,0,ry),
      };
      try {
        new ArchiveRoomRenderer(sink, map);
        expect(violations.slice(0, 8)).toEqual([]);
        expect(JSON.stringify(map)).toBe(before);
        expect(getRandomState()).toBe(rng);
      } finally { for (const geometry of owned) geometry.dispose(); }
    }
  } finally { box.dispose(); rod.dispose(); }
});
