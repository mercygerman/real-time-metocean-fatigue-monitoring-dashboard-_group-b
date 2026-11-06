/** Deterministic seeded PRNG (mulberry32) so SSR and client render the same history. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const uniform = (lo: number, hi: number) => lo + (hi - lo) * next();
  const getState = () => a;
  return { next, normal, uniform, getState };
}

export type Rng = ReturnType<typeof createRng>;
