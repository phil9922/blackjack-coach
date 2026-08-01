import type { Card, HandResult, PlayerHand } from './types'
import type { TableRules } from './rules'
import { evaluateHand, isBlackjack, isBusted } from './hand'

export interface Settlement {
  result: HandResult
  /** profit relative to the bet: +bet on a win, -bet on a loss, 0 on push */
  net: number
}

export function settleHand(
  hand: PlayerHand,
  dealerCards: Card[],
  rules: TableRules
): Settlement {
  if (hand.surrendered) return { result: 'surrender', net: -hand.bet / 2 }
  if (isBusted(hand.cards)) return { result: 'bust', net: -hand.bet }

  const playerBJ = isBlackjack(hand.cards, hand.isSplitHand)
  const dealerBJ = isBlackjack(dealerCards, false)

  if (playerBJ && dealerBJ) return { result: 'push', net: 0 }
  if (playerBJ) return { result: 'blackjack', net: hand.bet * rules.blackjackPayout }
  if (dealerBJ) return { result: 'lose', net: -hand.bet }

  const player = evaluateHand(hand.cards).total
  const dealer = evaluateHand(dealerCards).total

  if (dealer > 21) return { result: 'win', net: hand.bet }
  if (player > dealer) return { result: 'win', net: hand.bet }
  if (player < dealer) return { result: 'lose', net: -hand.bet }
  return { result: 'push', net: 0 }
}
