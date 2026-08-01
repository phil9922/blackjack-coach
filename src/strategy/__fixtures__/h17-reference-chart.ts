// Independently transcribed from https://wizardofodds.com/games/blackjack/strategy/4-decks/
// (chart image https://wizardofodds.com/blackjack/images/bj_4d_h17.gif, "4-8 Decks,
// Dealer Hits on Soft 17") on 2026-07-31.
// Rules: 6 decks, H17, DAS, late surrender, double any two.
//
// Notes on encoding relative to the source chart:
// - The source marks 2,2 / 3,3 vs 2-3, 4,4 vs 5-6, and 6,6 vs 2 as "Ph"
//   (split if double after split allowed, otherwise hit). This fixture assumes
//   DAS, so those cells are encoded as 'P'.
// - 5,5 and 10,10 do not appear in the source's split table (never split);
//   they are encoded here as their hard-total strategy (hard 10 and hard 20).
export type RefCode = 'H' | 'S' | 'P' | 'Dh' | 'Ds' | 'Rh' | 'Rs' | 'Rp'

// Columns in order: dealer upcard 2, 3, 4, 5, 6, 7, 8, 9, 10, A  (10 columns)
export const REF_HARD: Record<number, RefCode[]> = {
  5: ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  6: ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  7: ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  8: ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
  9: ['H', 'Dh', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
  10: ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'H', 'H'],
  11: ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh'],
  12: ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  13: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  14: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
  15: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'Rh', 'Rh'],
  16: ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'Rh', 'Rh', 'Rh'],
  17: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'Rs'],
  18: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  19: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  21: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
}

export const REF_SOFT: Record<number, RefCode[]> = {
  13: ['H', 'H', 'H', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
  14: ['H', 'H', 'H', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
  15: ['H', 'H', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
  16: ['H', 'H', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
  17: ['H', 'Dh', 'Dh', 'Dh', 'Dh', 'H', 'H', 'H', 'H', 'H'],
  18: ['Ds', 'Ds', 'Ds', 'Ds', 'Ds', 'S', 'S', 'H', 'H', 'H'],
  19: ['S', 'S', 'S', 'S', 'Ds', 'S', 'S', 'S', 'S', 'S'],
  20: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  21: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
}

export const REF_PAIRS: Record<string, RefCode[]> = {
  '2': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '3': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '4': ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  '5': ['Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'Dh', 'H', 'H'],
  '6': ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
  '7': ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
  '8': ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'Rp'],
  '9': ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
  '10': ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
  A: ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
}
