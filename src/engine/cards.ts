import type { Card, Rank, Suit } from './types'
import { rngInt } from './rng'

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

/** Pip value with ace as 1; hand evaluation promotes one ace to 11. */
export function cardValue(rank: Rank): number {
  if (rank === 'A') return 1
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10
  return Number(rank)
}

/** J/Q/K normalize to '10' for strategy and pair purposes. */
export function normalizeRank(rank: Rank): Rank {
  return rank === 'J' || rank === 'Q' || rank === 'K' ? '10' : rank
}

export function buildShoe(decks: number): Card[] {
  const shoe: Card[] = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit })
      }
    }
  }
  return shoe
}

/** Fisher-Yates with pure RNG state threading. */
export function shuffle(cards: Card[], rngState: number): { cards: Card[]; state: number } {
  const out = cards.slice()
  let state = rngState
  for (let i = out.length - 1; i > 0; i--) {
    const r = rngInt(state, i + 1)
    state = r.state
    const j = r.value
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return { cards: out, state }
}
