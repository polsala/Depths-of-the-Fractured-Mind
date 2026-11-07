import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import contract from "../src/assets/hero-atlas-contract.json";
import { heroFrame } from "../src/assets/hero-sprites";
import { validateFrames } from "../utils/build-hero-atlases.mjs";

describe("hero atlas contract", () => {
  it("addresses all directional/action frames and freezes motion when requested", () => {
    expect(heroFrame("elias", "idle", 0)).toMatchObject({ x: 0, y: 0, width: 128, height: 160 });
    expect(heroFrame("miriam", "idle", 500)).toMatchObject({ x: 384, y: 0 });
    expect(heroFrame("subject13", "walkNorth", 180)).toMatchObject({ x: 256, y: 0 });
    expect(heroFrame("anya", "walkWest", 180)).toMatchObject({ x: 384, y: 160, flipX: true });
    expect(heroFrame("elias", "attack", 140)).toMatchObject({ x: 0, y: 320 });
    expect(heroFrame("elias", "attack", 3000)).toMatchObject({ x: 0, y: 320 });
    expect(heroFrame("miriam", "cast", 180)).toMatchObject({ x: 256, y: 320 });
    expect(heroFrame("subject13", "hit", 120)).toMatchObject({ x: 256, y: 320 });
    expect(heroFrame("anya", "death", 0)).toMatchObject({ x: 384, y: 320 });
    expect(heroFrame("anya", "walkWest", 180, true)).toMatchObject({ x: 256, y: 160 });
  });

  it("ships twelve populated RGBA frames per protagonist with real transparency", () => {
    for (const [name, character] of Object.entries(contract.characters)) {
      const atlas = PNG.sync.read(readFileSync(new URL(`../public/assets/sprites/characters/${character.atlas}`, import.meta.url)));
      expect(() => validateFrames(name, atlas)).not.toThrow();
      expect(atlas.data[3]).toBe(0);
    }
  });

  it("rejects wrong dimensions, opaque matte and an empty action frame", () => {
    const valid = PNG.sync.read(readFileSync(new URL("../public/assets/sprites/characters/elias/hero-atlas.png", import.meta.url)));
    expect(() => validateFrames("broken", new PNG({ width: 256, height: 256 }))).toThrow(/dimensions/);
    const opaque = PNG.sync.read(PNG.sync.write(valid));
    for (let i = 3; i < opaque.data.length; i += 4) opaque.data[i] = 255;
    expect(() => validateFrames("opaque", opaque)).toThrow(/transparency/);
    const missing = PNG.sync.read(PNG.sync.write(valid));
    for (let y = 320; y < 480; y++) for (let x = 0; x < 128; x++) missing.data[(y * 512 + x) * 4 + 3] = 0;
    expect(() => validateFrames("missing", missing)).toThrow(/empty frame 8/);
  });
});
