import type { Rank } from '../engine/types'

/**
 * Card counting systems.
 *
 * The app ships one *verified* index set — the Hi-Lo Illustrious 18 / Fab 4,
 * checked against BJA's H17 chart and Wong's Professional Blackjack. Index
 * numbers are system-specific: a Hi-Lo index applied to a KO or Hi-Opt I count
 * is simply a wrong play. So a system that doesn't carry its own verified
 * indices declares `supportsDeviations: false`, and the app grades plays as
 * straight basic strategy while it is selected. Counting practice — running
 * count, true count, quizzes, speed drill, bet ramp — works for all of them.
 *
 * Do not flip `supportsDeviations` on for a system without transcribing and
 * testing its index set the way `src/strategy/__fixtures__` does for the chart.
 * `docs/index-set-sourcing.md` records which sources were already checked for
 * KO and Hi-Opt I, why none of them clears that bar, and what would unblock it —
 * read it before spending another afternoon looking.
 */

export type CountSystemId = 'hilo' | 'ko' | 'hiopt1'

export interface CountSystem {
  id: CountSystemId
  name: string
  /** one-line pitch for the settings list */
  blurb: string
  /** why you'd pick it / what it costs you, shown under the selector */
  detail: string
  /** tag value per normalized rank */
  values: Record<Rank, number>
  /**
   * Balanced systems sum to zero across a full deck and need converting to a
   * true count. Unbalanced ones (KO) are built so the running count alone
   * tracks the edge, which is the whole point of them.
   */
  balanced: boolean
  /** the app only ships verified Hi-Lo indices — see the note above */
  supportsDeviations: boolean
  /** aces tagged 0 need a separate ace side count for accurate betting */
  aceNeutral: boolean
}

/** Aces and tens are one tag in every system here; J/Q/K follow 10. */
function tags(spec: {
  a: number
  low: number[] // ranks tagged +1
  zero: number[]
  ten: number
}): Record<Rank, number> {
  const v = (r: Rank): number => {
    if (r === 'A') return spec.a
    if (r === '10' || r === 'J' || r === 'Q' || r === 'K') return spec.ten
    const n = Number(r)
    if (spec.low.includes(n)) return 1
    if (spec.zero.includes(n)) return 0
    return 0
  }
  const out = {} as Record<Rank, number>
  for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as Rank[]) {
    out[r] = v(r)
  }
  return out
}

export const COUNT_SYSTEMS: Record<CountSystemId, CountSystem> = {
  hilo: {
    id: 'hilo',
    name: 'Hi-Lo',
    blurb: 'The standard. Balanced, true-count based.',
    detail:
      'The most widely used count and the one this app grades deviations against. ' +
      '2-6 are +1, 7-9 are 0, tens and aces are -1. Balanced, so you convert the ' +
      'running count to a true count by dividing by decks remaining.',
    values: tags({ a: -1, low: [2, 3, 4, 5, 6], zero: [7, 8, 9], ten: -1 }),
    balanced: true,
    supportsDeviations: true,
    aceNeutral: false,
  },
  ko: {
    id: 'ko',
    name: 'KO (Knock-Out)',
    blurb: 'Unbalanced — no true-count division.',
    detail:
      'Adds the 7 to the +1 group, which makes the count unbalanced on purpose: ' +
      'you play straight off the running count and never divide by decks ' +
      'remaining. Easier at a real table, slightly less precise. The shoe starts ' +
      'at a negative running count rather than zero.',
    values: tags({ a: -1, low: [2, 3, 4, 5, 6, 7], zero: [8, 9], ten: -1 }),
    balanced: false,
    supportsDeviations: false,
    aceNeutral: false,
  },
  hiopt1: {
    id: 'hiopt1',
    name: 'Hi-Opt I',
    blurb: 'Balanced, ace-neutral. Stronger for play, needs an ace side count.',
    detail:
      'Ignores 2s, 7s, 8s, 9s and aces; counts 3-6 as +1 and tens as -1. Tracking ' +
      'tens more cleanly makes it better at playing decisions, but because aces ' +
      'are neutral the count under-reads your betting edge unless you side-count ' +
      'aces separately. Balanced, so it uses a true count.',
    values: tags({ a: 0, low: [3, 4, 5, 6], zero: [2, 7, 8, 9], ten: -1 }),
    balanced: true,
    supportsDeviations: false,
    aceNeutral: true,
  },
}

export const COUNT_SYSTEM_LIST: CountSystem[] = [
  COUNT_SYSTEMS.hilo,
  COUNT_SYSTEMS.ko,
  COUNT_SYSTEMS.hiopt1,
]

export const DEFAULT_COUNT_SYSTEM: CountSystemId = 'hilo'

export function getCountSystem(id: CountSystemId | undefined): CountSystem {
  return COUNT_SYSTEMS[id ?? DEFAULT_COUNT_SYSTEM] ?? COUNT_SYSTEMS[DEFAULT_COUNT_SYSTEM]
}

export function tagValue(system: CountSystem, rank: Rank): number {
  return system.values[rank]
}

/**
 * Running count a fresh shoe starts at.
 *
 * Balanced systems start at zero. KO is unbalanced by +4 per deck (the added
 * 7s), so it starts at the standard Initial Running Count of 4 x (1 - decks) —
 * -20 for a six-deck shoe. Starting there is what makes KO's fixed pivot work
 * across deck counts.
 */
export function initialRunningCount(system: CountSystem, decks: number): number {
  if (system.balanced) return 0
  return 4 * (1 - decks)
}

/**
 * KO's two published anchor points, from the standard Knock-Out tables.
 *
 * The Pivot Point is +4 for every deck count — that is the property the
 * negative IRC buys you. The Key Count (where the player's edge crosses zero
 * and betting should start climbing) does move with deck count, and it is a
 * table, not a formula: interpolating the published values is an approximation,
 * so a shoe size that isn't listed rounds to the nearest listed one.
 *
 * Both numbers are locked by `__fixtures__/ko-reference.ts`, transcribed from
 * published sources independently of this file. Don't edit them here without
 * re-sourcing the fixture — the whole point is that the two were written apart.
 */
export const KO_PIVOT = 4

const KO_KEY_COUNTS: Record<number, number> = { 1: 2, 2: 1, 4: -1, 6: -4, 8: -6 }

export function koKeyCount(decks: number): number {
  const listed = KO_KEY_COUNTS[decks]
  if (listed !== undefined) return listed
  // Ties round toward the larger shoe, whose key count is lower — that ramps
  // later, so an unlisted deck count errs toward betting less rather than more.
  const nearest = Object.keys(KO_KEY_COUNTS)
    .map(Number)
    .reduce((best, d) => (Math.abs(d - decks) <= Math.abs(best - decks) ? d : best))
  return KO_KEY_COUNTS[nearest]
}

/**
 * Where the shoe stands, on a scale both kinds of system can share:
 * negative is bad for the player, 0 is roughly break-even, and higher is
 * better. Balanced systems report their true count directly. KO reports how
 * far the running count sits above its key count.
 */
export function bettingCount(
  system: CountSystem,
  runningCount: number,
  trueCountValue: number,
  decks: number
): number {
  return system.balanced ? trueCountValue : runningCount - koKeyCount(decks)
}

/** Sum a system's tags over a list of ranks. */
export function countRanks(system: CountSystem, ranks: Rank[]): number {
  return ranks.reduce((sum, r) => sum + tagValue(system, r), 0)
}
