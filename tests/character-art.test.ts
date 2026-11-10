import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { characterContract, characterFrame } from "../src/assets/character-sprites";
import { GameController } from "../src/game/index";
import { createEnemyState } from "../src/game/combat/encounters";
import { ENEMIES } from "../src/game/enemies";
import { presentDungeon } from "../src/graphics/dungeon/types";
import { getRandomState } from "../src/game/random";

it("uses held anticipation, contact and recovery poses inside the existing 650 ms combat cue", () => {
  expect([0, 119, 120, 219, 220, 290, 380, 510, 649, 650, 1000].map((ms) => characterFrame("attack", ms).index))
    .toEqual([3, 3, 4, 4, 5, 6, 7, 8, 8, 8, 8]);
  expect(characterFrame("idle", 1400).index).toBe(0);
  expect(characterFrame("idle", 700).index).toBe(1);
  expect(characterFrame("death", 10_000).index).toBe(15);
  expect(characterFrame("death", 0, true).index).toBe(15);
  expect(characterFrame("attack", 350, true).index).toBe(3);
});

it("ships 32 distinct nonempty poses with true alpha, safe edges and the declared native grid", () => {
  for (const entry of Object.values(characterContract.characters)) {
    const image = PNG.sync.read(readFileSync(`public/assets/sprites/characters/${entry.atlas}`));
    expect([image.width, image.height]).toEqual([512, 640]);
    const hashes = new Set<string>();
    for (let frame = 0; frame < 16; frame++) {
      const step = characterContract.logicalPixelScale;
      const blocks = new Uint32Array(128 * 160 / (step * step)); let opaque = 0, transparent = 0, lowest = 0;
      let binary = true, grid = true, safeEdges = true;
      for (let y = 0; y < 160; y += step) for (let x = 0; x < 128; x += step) {
        const p = ((Math.floor(frame / 4) * 160 + y) * image.width + frame % 4 * 128 + x) * 4;
        const pixel = image.data.readUInt32BE(p), alpha = pixel & 255;
        binary &&= alpha === 0 || alpha === 255;
        for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) {
          const other = p + (dy * image.width + dx) * 4;
          grid &&= image.data.readUInt32BE(other) === pixel;
        }
        blocks[y / step * (128 / step) + x / step] = pixel;
        if (alpha) { opaque++; lowest = Math.max(lowest, y + step); safeEdges &&= x > 0 && x < 127; }
        else transparent++;
        if (x === 0 || x === 127 || y < 2 || y >= 150) safeEdges &&= alpha === 0;
      }
      hashes.add(Buffer.from(blocks.buffer).toString("base64"));
      expect({ binary, grid, safeEdges }, `${entry.atlas} frame ${frame}`).toEqual({ binary: true, grid: true, safeEdges: true });
      expect(opaque).toBeGreaterThan(450); expect(transparent).toBeGreaterThan(1000);
      expect(Math.abs(lowest - characterContract.pivot[1] * 160)).toBeLessThanOrEqual(2);
    }
    expect(hashes.size).toBe(16);
  }
});

it("shows the existing security detail without reviving a defeated escaped guard or changing state/RNG", () => {
  const game = new GameController(); game.newGame(130013);
  const state = game.getState(), rng = getRandomState();
  expect(presentDungeon(state).guardPresent).toBe(true);
  state.intakeEncounter = { enemies: [createEnemyState(ENEMIES.deranged_guard), createEnemyState(ENEMIES.corrupted_rat)] };
  state.intakeEncounter.enemies[0].alive = false;
  state.intakeEncounter.enemies[0].stats.hp = 0;
  const before = JSON.stringify(state.intakeEncounter);
  expect(presentDungeon(state).guardPresent).toBe(false);
  expect(JSON.stringify(state.intakeEncounter)).toBe(before);
  expect(getRandomState()).toBe(rng);
  state.flags.intakeEncounterWon = true;
  expect(presentDungeon(state).guardPresent).toBe(false);
});
