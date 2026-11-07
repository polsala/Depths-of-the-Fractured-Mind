// A run owns one deterministic random stream. The snapshot stores its current
// state so continuing a run cannot re-roll future maps, encounters or loot.
let state: number | null = null;
let initialSeed: number | null = null;

export function startRun(seed?: number): number {
  const source = seed ?? (globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 0x100000000));
  state = (source >>> 0) || 0x6d2b79f5;
  initialSeed = state;
  return state;
}

export function restoreRandomState(value: number, seed: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 0xffffffff ||
      !Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) {
    throw new Error("Invalid saved random state");
  }
  state = value;
  initialSeed = seed;
}

export function getRandomState(): number | null {
  return state;
}

export function getRunSeed(): number | null {
  return initialSeed;
}

export function gameRandom(): number {
  if (state === null) return Math.random(); // Standalone rule tests.
  let value = state;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state = value >>> 0;
  return state / 0x100000000;
}
