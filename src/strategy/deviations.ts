import type { Rank } from '../engine/types'
import type { Action, HandKey } from './types'

/**
 * Count-based deviations from basic strategy, 6-deck HIT-soft-17, Hi-Lo,
 * floored true counts. Verified against H17-specific published sources:
 *  - Blackjack Apprenticeship's H17 deviation chart (primary; sim-derived)
 *  - Stanford Wong, Professional Blackjack, 6D H17 DAS indices (fills plays
 *    BJA omits: 12v5, 12v6, 13v3, 14v10 surrender)
 * Convention for stand/hit indices: stand at TC >= index, hit below — so a
 * `atOrBelow` hit threshold is (index - 1).
 *
 * H17 notes: 11 vs A and soft 19 vs 6 are BASIC strategy (not deviations);
 * 17 vs A is an unconditional basic surrender; 10 vs A doubles at +3 (S17: +4);
 * 12 vs 6 is -3 (S17: -1); 15 vs A surrender carries a reverse index (-1).
 */
export interface Deviation {
  id: string
  key: HandKey
  dealerUp: Rank
  threshold: number
  dir: 'atOrAbove' | 'atOrBelow'
  action: Action
  /** surrender is better than this deviation whenever it's available */
  skipIfSurrender?: boolean
  /** only meaningful when surrender is available (reverse-surrender indices) */
  onlyIfSurrender?: boolean
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
    skipIfSurrender: true,
    reason: tenRich('16 vs 10 is nearly a coin flip between hit and stand', 'standing (the dealer breaks more often, and your hit busts more often)') },
  { id: 'I18-15v10', key: { kind: 'hard', total: 15 }, dealerUp: '10', threshold: 4, dir: 'atOrAbove', action: 'stand',
    skipIfSurrender: true,
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
  // H17 index: +3 (S17 charts say +4)
  { id: 'I18-10vA', key: { kind: 'hard', total: 10 }, dealerUp: 'A', threshold: 3, dir: 'atOrAbove', action: 'double',
    reason: tenRich('10 vs A (after the peek clears blackjack)', 'doubling — under H17 this flips a point earlier than the S17 charts say') },
  { id: 'I18-9v7', key: { kind: 'hard', total: 9 }, dealerUp: '7', threshold: 3, dir: 'atOrAbove', action: 'double',
    reason: tenRich('9 vs 7', 'doubling — you make 19 against a likely 17') },
  // BJA H17 chart: +4 (Wong/Schlesinger print 5; EV difference at the boundary is tiny)
  { id: 'I18-16v9', key: { kind: 'hard', total: 16 }, dealerUp: '9', threshold: 4, dir: 'atOrAbove', action: 'stand',
    skipIfSurrender: true,
    reason: tenRich('16 vs 9', 'standing') },
  // stand at TC >= 0, hit below (index 0 under H17)
  { id: 'I18-13v2', key: { kind: 'hard', total: 13 }, dealerUp: '2', threshold: -1, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('13 vs 2') },
  // stand at TC >= 0, hit at any negative count (index 0)
  { id: 'I18-12v4', key: { kind: 'hard', total: 12 }, dealerUp: '4', threshold: -1, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('12 vs 4') },
  // H17 index -1: stand at >= -1, hit at -2 and below
  { id: 'I18-12v5', key: { kind: 'hard', total: 12 }, dealerUp: '5', threshold: -2, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('12 vs 5') },
  // H17 index -3 (S17 is -1 — the soft-17 re-draw strengthens the dealer's 6)
  { id: 'I18-12v6', key: { kind: 'hard', total: 12 }, dealerUp: '6', threshold: -4, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('12 vs 6 (under H17 the dealer\'s 6 is stronger than it looks — this only flips deep in negative counts)') },
  // index -2: stand at >= -2, hit at -3 and below
  { id: 'I18-13v3', key: { kind: 'hard', total: 13 }, dealerUp: '3', threshold: -3, dir: 'atOrBelow', action: 'hit',
    reason: tenPoor('13 vs 3') },

  // ---- Fab 4 surrenders (H17, late surrender) ----
  { id: 'FAB4-15v9', key: { kind: 'hard', total: 15 }, dealerUp: '9', threshold: 2, dir: 'atOrAbove', action: 'surrender',
    onlyIfSurrender: true,
    reason: tenRich('15 vs 9', 'surrendering — losing half a bet beats playing out a hand that now loses well over half the time') },
  { id: 'FAB4-14v10', key: { kind: 'hard', total: 14 }, dealerUp: '10', threshold: 3, dir: 'atOrAbove', action: 'surrender',
    onlyIfSurrender: true,
    reason: tenRich('14 vs 10', 'surrendering') },
  // Reverse indices: basic strategy surrenders these, but a negative shoe
  // makes the hand worth playing out.
  { id: 'FAB4-15v10-neg', key: { kind: 'hard', total: 15 }, dealerUp: '10', threshold: -1, dir: 'atOrBelow', action: 'hit',
    onlyIfSurrender: true,
    reason: tenPoor('15 vs 10 normally surrenders, but in a negative shoe your hit card is small and the dealer breaks more — playing on beats giving up half') },
  // H17 index -1: surrender at TC >= -1, hit at -2 and below (S17 index is +2)
  { id: 'FAB4-15vA-neg', key: { kind: 'hard', total: 15 }, dealerUp: 'A', threshold: -2, dir: 'atOrBelow', action: 'hit',
    onlyIfSurrender: true,
    reason: tenPoor('15 vs A normally surrenders under H17, but deep in a negative shoe the hand is worth playing out') },
]

/** Insurance becomes profitable when tens are this concentrated. */
export const INSURANCE_INDEX = 3

function sameKey(a: HandKey, b: HandKey): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'pair' && b.kind === 'pair') return a.rank === b.rank
  if (a.kind !== 'pair' && b.kind !== 'pair') return a.total === b.total
  return false
}

export function findDeviation(
  key: HandKey,
  up: Rank,
  trueCount: number,
  surrenderAvailable: boolean
): Deviation | null {
  for (const dev of DEVIATIONS) {
    if (dev.dealerUp !== up || !sameKey(dev.key, key)) continue
    if (dev.skipIfSurrender && surrenderAvailable) continue
    if (dev.onlyIfSurrender && !surrenderAvailable) continue
    const triggered =
      dev.dir === 'atOrAbove' ? trueCount >= dev.threshold : trueCount <= dev.threshold
    if (triggered) return dev
  }
  return null
}
