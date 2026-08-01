export function decksRemaining(cardsRemaining: number): number {
  return cardsRemaining / 52
}

/**
 * True count = running count / decks remaining, floored toward zero
 * (the conservative convention used by deviation indices). Decks remaining
 * is clamped to half a deck so end-of-shoe values don't explode.
 */
export function trueCount(runningCount: number, cardsRemaining: number): number {
  const decks = Math.max(decksRemaining(cardsRemaining), 0.5)
  return Math.trunc(runningCount / decks)
}

/** Unfloored, for quiz tolerance checks. */
export function trueCountExact(runningCount: number, cardsRemaining: number): number {
  const decks = Math.max(decksRemaining(cardsRemaining), 0.5)
  return runningCount / decks
}
