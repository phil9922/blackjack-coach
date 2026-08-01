import type { Card, HandValue, PlayerHand, Rank } from './types'
import { cardValue, normalizeRank } from './cards'

export function evaluateHand(cards: Card[]): HandValue {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c.rank)
    if (c.rank === 'A') aces++
  }
  // Promote one ace to 11 if it fits (only one can ever fit).
  if (aces > 0 && total + 10 <= 21) {
    return { total: total + 10, soft: true }
  }
  return { total, soft: false }
}

export function isBusted(cards: Card[]): boolean {
  return evaluateHand(cards).total > 21
}

/** Natural blackjack: first two cards totaling 21, not from a split. */
export function isBlackjack(cards: Card[], isSplitHand: boolean): boolean {
  return !isSplitHand && cards.length === 2 && evaluateHand(cards).total === 21
}

/** Two cards of equal value (any ten-value pair counts, e.g. K+Q). */
export function isPairHand(cards: Card[]): boolean {
  return cards.length === 2 && normalizeRank(cards[0].rank) === normalizeRank(cards[1].rank)
}

export function pairRank(cards: Card[]): Rank | null {
  return isPairHand(cards) ? normalizeRank(cards[0].rank) : null
}

/** A hand that can take no further action this round. */
export function isHandResolved(hand: PlayerHand): boolean {
  if (hand.surrendered || hand.stood || hand.result !== null) return true
  if (hand.doubled && hand.cards.length >= 3) return true
  if (hand.fromSplitAces && hand.cards.length >= 2) return true
  const { total } = evaluateHand(hand.cards)
  return total >= 21
}
