import type { Rank } from '../engine/types'
import type { ActionCode } from './types'

/**
 * Basic strategy for: 6 decks, dealer HITS soft 17 (H17), double after split,
 * late surrender available (cells carry R-codes; they resolve to the fallback
 * when surrender is disabled or unavailable), double any two cards.
 *
 * Columns in dealer-upcard order: 2, 3, 4, 5, 6, 7, 8, 9, 10, A.
 *
 * H17-specific cells (differ from S17 charts): 11 vs A = Dh, hard 15 vs A = Rh,
 * hard 17 vs A = Rs, soft 18 vs 2 = Ds, soft 19 vs 6 = Ds, 8,8 vs A = Rp.
 */

export const DEALER_ORDER: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']

export function dealerIndex(up: Rank): number {
  const idx = DEALER_ORDER.indexOf(up)
  if (idx === -1) throw new Error(`dealer upcard not normalized: ${up}`)
  return idx
}

//                                          2     3     4     5     6     7     8     9     10    A
export const HARD: Record<number, ActionCode[]> = {
  5:  ['H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H'],
  6:  ['H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H'],
  7:  ['H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H'],
  8:  ['H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H',  'H'],
  9:  ['H',  'Dh', 'Dh', 'Dh', 'Dh', 'H',  'H',  'H',  'H',  'H'],
  10: ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'H',  'H'],
  11: ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh'],
  12: ['H',  'H',  'S',  'S',  'S',  'H',  'H',  'H',  'H',  'H'],
  13: ['S',  'S',  'S',  'S',  'S',  'H',  'H',  'H',  'H',  'H'],
  14: ['S',  'S',  'S',  'S',  'S',  'H',  'H',  'H',  'H',  'H'],
  15: ['S',  'S',  'S',  'S',  'S',  'H',  'H',  'H',  'Rh', 'Rh'],
  16: ['S',  'S',  'S',  'S',  'S',  'H',  'H',  'Rh', 'Rh', 'Rh'],
  17: ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'Rs'],
  18: ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
  19: ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
  20: ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
  21: ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
}

//                                          2     3     4     5     6     7     8     9     10    A
export const SOFT: Record<number, ActionCode[]> = {
  13: ['H',  'H',  'H',  'Dh', 'Dh', 'H',  'H',  'H',  'H',  'H'],
  14: ['H',  'H',  'H',  'Dh', 'Dh', 'H',  'H',  'H',  'H',  'H'],
  15: ['H',  'H',  'Dh', 'Dh', 'Dh', 'H',  'H',  'H',  'H',  'H'],
  16: ['H',  'H',  'Dh', 'Dh', 'Dh', 'H',  'H',  'H',  'H',  'H'],
  17: ['H',  'Dh', 'Dh', 'Dh', 'Dh', 'H',  'H',  'H',  'H',  'H'],
  18: ['Ds', 'Ds', 'Ds', 'Ds', 'Ds', 'S',  'S',  'H',  'H',  'H'],
  19: ['S',  'S',  'S',  'S',  'Ds', 'S',  'S',  'S',  'S',  'S'],
  20: ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
  21: ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
}

//                                          2     3     4     5     6     7     8     9     10    A
export const PAIRS: Record<string, ActionCode[]> = {
  '2':  ['P',  'P',  'P',  'P',  'P',  'P',  'H',  'H',  'H',  'H'],
  '3':  ['P',  'P',  'P',  'P',  'P',  'P',  'H',  'H',  'H',  'H'],
  '4':  ['H',  'H',  'H',  'P',  'P',  'H',  'H',  'H',  'H',  'H'],
  '5':  ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'H',  'H'],
  '6':  ['P',  'P',  'P',  'P',  'P',  'H',  'H',  'H',  'H',  'H'],
  '7':  ['P',  'P',  'P',  'P',  'P',  'P',  'H',  'H',  'H',  'H'],
  '8':  ['P',  'P',  'P',  'P',  'P',  'P',  'P',  'P',  'P',  'Rp'],
  '9':  ['P',  'P',  'P',  'P',  'P',  'S',  'P',  'P',  'S',  'S'],
  '10': ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
  'A':  ['P',  'P',  'P',  'P',  'P',  'P',  'P',  'P',  'P',  'P'],
}
