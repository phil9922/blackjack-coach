import type { Rank } from '../engine/types'
import type { Action, HandKey } from './types'

/**
 * Count-based deviations from basic strategy (Illustrious 18 + Fab 4),
 * adjusted for 6-deck H17 with late surrender:
 *  - 11 vs A and soft 19 vs 6 are BASIC strategy under H17, so they are not here.
 *  - 15 vs A surrender is basic under H17; the Fab 4 entries here are the rest.
 * Thresholds compare against the true count floored toward zero.
 */
export interface Deviation {
  id: string
  key: HandKey
  dealerUp: Rank
  threshold: number
  dir: 'atOrAbove' | 'atOrBelow'
  action: Action
  reason: string
}

const tenRich = (spot: string, action: string) =>
  `${spot}: a positive count means the remaining shoe is rich in tens and aces — ` +
  `the dealer's hole card and next cards are more likely to be ten-value, which makes ${action} the better play.`

const tenPoor = (spot: string) =>
  `${spot}: a negative count means the shoe is loaded with small cards — your hit card is ` +
  `less likely to bust you and the dealer is more likely to make a hand, so hitting overtakes standing.`

export const DEVIATIONS: Deviation[] = [
  // ---- Illustrious 18 (H17, 6D) ----
  { id: 'I18-16v10', key: { kind: 'hard', total: 16 }, dealerUp: '10', threshold: 0, dir: 'atOrAbove', action: 'stand',
    reason: tenRich('16 vs 10 is nearly a coin flip between hit and stand', 'standing (the dealer breaks more often, and your hit busts more often)') },
  { id: 'I18-15v10', key: { kind: 'hard', total: 15 }, dealerUp: '10', threshold: 4, dir: 'atOrAbove', action: 'stand',
    reason: tenRich('15 vs 10', 'standing') },
  { id: 'I18-TTv5', key: { kind: 'pair', rank: '10' }, dealerUp: '5', threshold: 5, dir: 'atOrAbove', action: 'split',
    reason: tenRich('10,10 vs 5', 'splitting — each new hand starting with a ten is a big favorite against a breaking dealer when tens remain plentiful') },
  { id: 'I18-TTv6', key: { kind: 'pair', rank: '10' }, dealerUp: '6', threshold: 4, dir: 'atOrAbove', action: 'split',
    reason: tenRich('10,10 vs 6', 'splitting — two strong hands beat one against the dealer\'s weakest card in a ten-rich shoe') },
  { id: 'I18-10v10', key: { kind: 'hard', total: 10 }, dealerUp: '10', threshold: 4, dir: 'atOrAbove', action: 'double',
    reason: tenRich('10 vs 10', 'doubling — you draw to 20 often enough to press the bet') },
  { id: 'I18-12v3', key: { kind: 'hard', total: 12 }, dealerUp: '3', threshold: 2, dir: 'atOrAbove', action: 'stand',
    reason: tenRich('12 vs 3', 'standing — your hit busts more often and the dealer breaks more often') },
  { id: 'I18-12v2', key: { kind: 'hard', total: 12 }, dealerUp: '2', threshold: 3, dir: 'atOrAbove', action: 'stand',
    reason: tenRich('12 vs 2', 'standing') },
  { id: 'I18-9v2', key: { kind: 'hard', total: 9 }, dealerUp: '2', threshold: 1, dir: 'atOrAbove', action: 'double',
    reason: tenRich('9 vs 2', 'doubling — tens turn your 9 into 19 while the dealer\'s 2 stays weak') },
  { id: 'I18-10vA', key: { kind: 'hard', total: 10 }, dealerUp: 'A', threshold: 3, dir: 'atOrAbove', action: 'double',
    reason: tenRich('10 vs A (after the peek clears blackjack)', 'doubling') },
  { id: 'I18-9v7', key: { kind: 'hard', total: 9 }, dealerUp: '7', threshold: 3, dir: 'atOrAbove', action: 'double',
    reason: tenRich('9 vs 7', 'doubling — you make 19 against a likely 17') },
  { id: 'I18-16v9', key: { kind: 'hard', total: 16 }, dealerUp: '9', threshold: 5, dir: 'atOrAbove', action: 'stand',
    reason: tenRich('16 vs 9', 'standing') },
  { id: 'I18-13v2', key: { kind: 'hard', total: 13 }, dealerUp: '2', threshold: -1, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('13 vs 2') },
  { id: 'I18-12v4', key: { kind: 'hard', total: 12 }, dealerUp: '4', threshold: 0, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('12 vs 4 (at TC 0 or below, e.g. right off a shuffle it is basic strategy to stand — this fires when the count has gone negative)') },
  { id: 'I18-12v5', key: { kind: 'hard', total: 12 }, dealerUp: '5', threshold: -2, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('12 vs 5') },
  { id: 'I18-12v6', key: { kind: 'hard', total: 12 }, dealerUp: '6', threshold: -1, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('12 vs 6') },
  { id: 'I18-13v3', key: { kind: 'hard', total: 13 }, dealerUp: '3', threshold: -2, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('13 vs 3') },

  // ---- Fab 4 surrenders (H17: 15vA is already basic surrender) ----
  { id: 'FAB4-15v9', key: { kind: 'hard', total: 15 }, dealerUp: '9', threshold: 2, dir: 'atOrAbove', action: 'surrender',
    reason: tenRich('15 vs 9', 'surrendering — losing half a bet beats playing out a hand that now loses well over half the time') },
  { id: 'FAB4-14v10', key: { kind: 'hard', total: 14 }, dealerUp: '10', threshold: 3, dir: 'atOrAbove', action: 'surrender',
    reason: tenRich('14 vs 10', 'surrendering') },
]

/** Insurance becomes profitable when tens are this concentrated. */
export const INSURANCE_INDEX = 3

function sameKey(a: HandKey, b: HandKey): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'pair' && b.kind === 'pair') return a.rank === b.rank
  if (a.kind !== 'pair' && b.kind !== 'pair') return a.total === b.total
  return false
}

export function findDeviation(key: HandKey, up: Rank, trueCount: number): Deviation | null {
  for (const dev of DEVIATIONS) {
    if (dev.dealerUp !== up || !sameKey(dev.key, key)) continue
    const triggered =
      dev.dir === 'atOrAbove' ? trueCount >= dev.threshold : trueCount <= dev.threshold
    if (triggered) return dev
  }
  return null
}
