/**
 * Mulberry32 seeded PRNG. Produces values in [0, 1).
 * The module exposes a single `rng()` function whose state is set by
 * calling `seedRng(seed)`. Use this for all world-generation randomness so
 * that a given seed produces a reproducible world.
 */

let state = 0

function mulberry32(s: number): number {
  s |= 0
  s = (s + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
}

/**
 * Seed the PRNG. Pass 0 (or omit) to seed with a truly random value.
 * Returns the actual seed used.
 */
export function seedRng(seed: number = 0): number {
  const actual = seed !== 0 ? seed : (Math.random() * 0xffffffff) | 0
  state = actual
  return actual
}

/** Returns the next pseudo-random float in [0, 1). */
export function rng(): number {
  return mulberry32(++state)
}
