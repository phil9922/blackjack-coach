import type { Card, Rank, TrainingMode } from '../engine/types'
import { normalizeRank } from '../engine/cards'
import { evaluateHand, isPairHand } from '../engine/hand'
import type { Action, ActionCode, Availability, CorrectPlay, HandKey } from './types'
import { HARD, SOFT, PAIRS, dealerIndex } from './basicStrategy'
import { findDeviation } from './deviations'

/**
 * Derive the strategy key for a hand. The pair table only applies when a split
 * is actually available; otherwise the hand falls through to its total.
 */
export function deriveHandKey(cards: Card[], av: Availability): HandKey {
  if (isPairHand(cards) && av.canSplit) {
    return { kind: 'pair', rank: normalizeRank(cards[0].rank) }
  }
  const { total, soft } = evaluateHand(cards)
  if (soft && total < 21) return { kind: 'soft', total }
  return { kind: 'hard', total: Math.min(total, 21) }
}

export function chartCode(key: HandKey, up: Rank): ActionCode {
  const col = dealerIndex(normalizeRank(up))
  switch (key.kind) {
    case 'pair':
      return PAIRS[key.rank][col]
    case 'soft':
      // Soft 12 (A,A when splitting is unavailable) has no chart row: always hit.
      if (key.total <= 12) return 'H'
      return SOFT[key.total][col]
    case 'hard':
      if (key.total < 5) return 'H'
      return HARD[key.total][col]
  }
}

/** Resolve a composite chart code against the actions actually available. */
export function resolveCode(code: ActionCode, av: Availability): Action {
  switch (code) {
    case 'H':
      return 'hit'
    case 'S':
      return 'stand'
    case 'P':
      return 'split'
    case 'Dh':
      return av.canDouble ? 'double' : 'hit'
    case 'Ds':
      return av.canDouble ? 'double' : 'stand'
    case 'Rh':
      return av.canSurrender ? 'surrender' : 'hit'
    case 'Rs':
      return av.canSurrender ? 'surrender' : 'stand'
    case 'Rp':
      // Only reachable via the pair table, so a split is available.
      return av.canSurrender ? 'surrender' : 'split'
  }
}

/**
 * The optimal play for a situation. In counting mode, deviation indices
 * (Illustrious 18 / Fab 4) are consulted first and override basic strategy
 * when the true count crosses their threshold and the action is legal.
 */
export function getCorrectAction(
  key: HandKey,
  up: Rank,
  av: Availability,
  mode: TrainingMode,
  trueCount: number
): CorrectPlay {
  if (mode === 'counting') {
    const dev = findDeviation(key, normalizeRank(up), trueCount)
    if (dev) {
      const legal =
        (dev.action !== 'double' || av.canDouble) &&
        (dev.action !== 'split' || av.canSplit) &&
        (dev.action !== 'surrender' || av.canSurrender)
      if (legal) return { action: dev.action, source: 'deviation', deviationId: dev.id }
    }
  }
  return { action: resolveCode(chartCode(key, up), av), source: 'basic' }
}
