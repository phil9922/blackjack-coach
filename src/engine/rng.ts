/**
 * Pure, deterministic PRNG (mulberry32 step). State lives in the game state so
 * the reducer stays pure and rounds are reproducible under a seed.
 */
export interface RngResult {
  value: number
  state: number
}

export function rngNext(state: number): RngResult {
  const t = (state + 0x6d2b79f5) | 0
  let x = Math.imul(t ^ (t >>> 15), 1 | t)
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
  return { value: ((x ^ (x >>> 14)) >>> 0) / 4294967296, state: t }
}

/** Uniform integer in [0, max) */
export function rngInt(state: number, max: number): RngResult {
  const r = rngNext(state)
  return { value: Math.floor(r.value * max), state: r.state }
}
