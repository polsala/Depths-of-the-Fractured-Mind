import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import contract from "../src/assets/presence-atlas-contract.json";
import { presenceFrame } from "../src/assets/presence-sprites";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const build = JSON.parse(readFileSync("public/assets/sprites/characters/phase01b-presence-build.json", "utf8"));
describe("protagonist first-person art contract", () => {
  it("has eight bounded explicit poses and a bottom-center registration", () => {
    expect(contract.poses).toEqual(["idle", "interact", "inspect", "attack", "cast", "brace", "hurt", "tension"]);
    expect(contract.pivot).toEqual([0.5, 1]);
    for (let i = 0; i < 8; i++) {
      const frame = presenceFrame(i);
      expect(frame.x + frame.width).toBeLessThanOrEqual(contract.width);
      expect(frame.y + frame.height).toBeLessThanOrEqual(contract.height);
    }
    expect(presenceFrame(-1).index).toBe(0);
    expect(presenceFrame(Number.NaN).index).toBe(0);
    expect(presenceFrame(99).index).toBe(7);
  });
  for (const [id, entry] of Object.entries(contract.characters)) {
    it(`${id} preserves all eight distinct, transparent, registered hand poses`, () => {
      const path = `public/assets/sprites/characters/${entry.atlas}`;
      const bytes = readFileSync(path);
      const image = PNG.sync.read(bytes);
      expect([image.width, image.height]).toEqual([contract.width, contract.height]);
      expect(hash(bytes)).toBe(build.characters[id].outputSha256);
      expect(hash(readFileSync(build.characters[id].source))).toBe(build.characters[id].sourceSha256);
      const hashes = new Set<string>();
      for (let frame = 0; frame < 8; frame++) {
        const cell = new PNG({ width: 256, height: 256 });
        PNG.bitblt(image, cell, frame % 4 * 256, Math.floor(frame / 4) * 256, 256, 256, 0, 0);
        let visible = 0, bottom = 0, binary = true, clearRgb = true, safe = true;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
          const i = (y * 256 + x) * 4, alpha = cell.data[i + 3];
          binary &&= alpha === 0 || alpha === 255;
          if (alpha) {
            visible++; if (y === 255) bottom++;
            // The top and sides remain clear; only forearms deliberately exit the bottom.
            safe &&= y >= 70 && x >= 30 && x < 226;
          } else clearRgb &&= cell.data[i] + cell.data[i + 1] + cell.data[i + 2] === 0;
        }
        expect({ binary, clearRgb, safe }, `${id} pose ${frame}`).toEqual({ binary: true, clearRgb: true, safe: true });
        expect(visible).toBeGreaterThan(1000); expect(bottom).toBeGreaterThan(10);
        hashes.add(hash(cell.data));
        expect(build.characters[id].frames[frame].root).toEqual([128, 256]);
        expect(hash(cell.data)).toBe(build.characters[id].frames[frame].sha256);
      }
      expect(hashes.size).toBe(8);
    });
  }
});
