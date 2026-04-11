// Seeded LCG RNG (Numerical Recipes constants).
// Returns a deterministic pseudo-random function in [0, 1).
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
