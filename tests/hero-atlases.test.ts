import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import contract from "../src/assets/hero-atlas-contract.json";
import { heroFrame } from "../src/assets/hero-sprites";
import { validateFrames } from "../utils/build-hero-atlases.mjs";

describe("hero atlas contract", () => {
  it("retains directional compatibility names and selects readable action phases at shared combat boundaries", () => {
    expect(heroFrame("elias", "idle", 0)).toMatchObject({ index: 0, x: 0, y: 0, width: 128, height: 160 });
    expect(heroFrame("miriam", "idle", 700)).toMatchObject({ index: 1, x: 128, y: 0 });
    expect(heroFrame("subject13", "walkNorth", 180)).toMatchObject({ index: 1 });
    expect(heroFrame("anya", "walkWest", 180)).toMatchObject({ index: 1, flipX: true });
    expect(heroFrame("elias", "attack", 142).index).toBe(3);
    expect(heroFrame("elias", "attack", 143).index).toBe(4);
    expect(heroFrame("elias", "attack", 402).index).toBe(4);
    expect(heroFrame("elias", "attack", 403).index).toBe(5);
    expect(heroFrame("elias", "attack", 3000).index).toBe(5);
    expect(heroFrame("miriam", "cast", 143).index).toBe(7);
    expect(heroFrame("subject13", "hit", 150).index).toBe(5);
    expect(heroFrame("anya", "death", 0)).toMatchObject({ index: 12, x: 0, y: 480 });
    expect(heroFrame("anya", "death", 650).index).toBe(15);
    expect(heroFrame("anya", "walkWest", 180, true).index).toBe(0);
    expect(heroFrame("anya", "death", 0, true).index).toBe(15);
    expect(heroFrame("miriam", "attack", NaN).index).toBe(3);
  });

  it("keeps every clip bounded and frozen in reduced motion; actions share the 650ms feedback window", () => {
    for (const [name, clip] of Object.entries(contract.animations)) {
      expect(clip.frames.length).toBe(clip.durations.length);
      expect(clip.durations.every(ms => Number.isInteger(ms) && ms >= 60)).toBe(true);
      expect(clip.frames.every(i => Number.isInteger(i) && i >= 0 && i < 16)).toBe(true);
      const animation = name as keyof typeof contract.animations;
      const frozen = heroFrame("elias", animation, 0, true);
      expect(heroFrame("elias", animation, 100000, true)).toEqual(frozen);
    }
    for (const action of ["attack", "cast", "death"] as const) {
      expect(contract.animations[action].durations.reduce((sum, ms) => sum + ms, 0)).toBe(650);
    }
  });

  it("ships sixteen distinct populated RGBA frames per protagonist with binary alpha, safe margins and stable idle contact", () => {
    for (const [name, character] of Object.entries(contract.characters)) {
      const atlas = PNG.sync.read(readFileSync(new URL(`../public/assets/sprites/characters/${character.atlas}`, import.meta.url)));
      expect(() => validateFrames(name, atlas)).not.toThrow();
      expect(atlas.data[3]).toBe(0);
      expect([atlas.width, atlas.height]).toEqual([512, 640]);
    }
  });

  it("rejects wrong dimensions, opaque matte, empty action, duplicated pose, clipping and unstable contact", () => {
    const valid = PNG.sync.read(readFileSync(new URL("../public/assets/sprites/characters/elias/hero-atlas.png", import.meta.url)));
    const copy = () => PNG.sync.read(PNG.sync.write(valid));
    expect(() => validateFrames("broken", new PNG({ width: 256, height: 256 }))).toThrow(/dimensions/);
    const opaque = copy();
    for (let i = 3; i < opaque.data.length; i += 4) opaque.data[i] = 255;
    expect(() => validateFrames("opaque", opaque)).toThrow(/transparency/);
    const missing = copy();
    for (let y = 320; y < 480; y++) for (let x = 0; x < 128; x++) missing.data[(y * 512 + x) * 4 + 3] = 0;
    expect(() => validateFrames("missing", missing)).toThrow(/empty frame 8/);
    const duplicate = copy();
    PNG.bitblt(valid, duplicate, 0, 0, 128, 160, 128, 0);
    expect(() => validateFrames("duplicate", duplicate)).toThrow(/duplicated pose/);
    const clipped = copy(); clipped.data[(20 * 512) * 4 + 3] = 255;
    expect(() => validateFrames("clipped", clipped)).toThrow(/clipped frame/);
    const contact = copy();
    for (let y = 144; y < 160; y++) for (let x = 0; x < 128; x++) contact.data[(y * 512 + x) * 4 + 3] = 0;
    expect(() => validateFrames("contact", contact)).toThrow(/contact drift/);
  });
});
