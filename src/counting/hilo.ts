import type { Card, Rank } from '../engine/types'

/** Hi-Lo: 2-6 are +1, 7-9 are 0, tens and aces are -1. */
export function hiLoValue(rank: Rank): number {
  switch (rank) {
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
      return 1
    case '7':
    case '8':
    case '9':
      return 0
    default:
      return -1
  }
}

export function countCards(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + hiLoValue(c.rank), 0)
}
