/** Pinned FNV-1a derivation and xorshift32. Independent of persisted gameplay RNG. */
export function deriveGenerationSeed(runSeed: number, depth: number, version: string, stream: string): number {
  let value = 2166136261;
  for (const character of `${runSeed >>> 0}:${depth}:${version}:${stream}`) {
    value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return value || 0x6d2b79f5;
}
export function generationRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x6d2b79f5;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    value >>>= 0;
    return value / 0x100000000;
  };
}
