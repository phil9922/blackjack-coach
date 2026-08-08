// KO (Knock-Out) reference numbers, independently transcribed on 2026-08-08.
//
// These exist for the same reason `h17-reference-chart.ts` does: the numbers in
// `src/counting/systems.ts` were written from memory of the standard tables, and
// a number nobody checked is a number nobody should trust. Everything below was
// re-transcribed from published sources without looking at `systems.ts`, and the
// test beside this file asserts the two agree cell for cell.
//
// Honest note on independence: every published KO table descends from one
// authority — Fuchs & Vancura, *Knock-Out Blackjack* (1998). What is independent
// here is the transcription path, not the underlying derivation. That is the same
// bargain the strategy chart fixture makes, and it catches the failure that
// actually matters: a digit typed wrong.
//
// Sources:
//   [1] https://www.bonusinsider.com/blackjack/the-knock-out-card-counting-system/
//       — tags, the IRC formula and per-deck IRC, Key Count table (1/2/6/8 decks).
//   [2] https://www.casinonewsdaily.com/blackjack-guide/the-ko-knockout-card-counting-system-in-blackjack/
//       — tags, the IRC formula and per-deck IRC, and the "+4 over a full deck"
//         balance property. Carries no Key Count table.
//   [3] https://www.blackjackinfo.com/community/threads/k-o-count-4-decks-information.10711/
//       — the 4-deck Key Count, which neither [1] nor [2] lists. Weaker sourcing
//         than the rest of this file (a forum, not a published table), and the app
//         deals 6 decks, so nothing currently reads it. Flagged rather than
//         omitted: leaving 4 out is what let it silently resolve to the 6-deck
//         value, which is the bug this fixture caught.

import type { Rank } from '../../engine/types'

/** [1], [2]: 2-7 are +1, 8-9 are 0, tens and aces are -1. */
export const REF_KO_TAGS: Record<Rank, number> = {
  A: -1,
  '2': 1,
  '3': 1,
  '4': 1,
  '5': 1,
  '6': 1,
  '7': 1,
  '8': 0,
  '9': 0,
  '10': -1,
  J: -1,
  Q: -1,
  K: -1,
}

/**
 * [1], [2]: Initial Running Count, IRC = 4 - (4 x decks).
 * Transcribed as the listed values rather than as the formula, so a wrong
 * formula in the app cannot be checked against itself.
 */
export const REF_KO_IRC: Record<number, number> = {
  1: 0,
  2: -4,
  4: -12,
  6: -20,
  8: -28,
}

/**
 * [1] for 1/2/6/8 decks, [3] for 4. The count at which the player's edge crosses
 * zero and the bet should start climbing. Unlike the pivot it moves with deck
 * count, and it is a published table rather than a formula — the gap from the IRC
 * runs +2, +5, +11, +16, +22 across these five shoe sizes, which no simple
 * expression reproduces.
 */
export const REF_KO_KEY_COUNT: Record<number, number> = {
  1: 2,
  2: 1,
  4: -1,
  6: -4,
  8: -6,
}

/**
 * [1], [3]: the Pivot Point is +4 for every deck count — the property the
 * negative IRC is chosen to buy. It corresponds to a Hi-Lo true count of about
 * +4, and it is where the maximum bet goes out.
 */
export const REF_KO_PIVOT = 4

/** Deck counts the sources above actually list. */
export const REF_KO_DECKS = [1, 2, 4, 6, 8]
