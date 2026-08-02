import type { Rank } from '../engine/types'

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'

/**
 * Composite chart codes: the chart stores intent, the lookup resolves it
 * against what is actually legal for the hand being played.
 */
export type ActionCode = 'H' | 'S' | 'P' | 'Dh' | 'Ds' | 'Rh' | 'Rs' | 'Rp'

export type HandKey =
  | { kind: 'hard'; total: number }
  | { kind: 'soft'; total: number }
  | { kind: 'pair'; rank: Rank }

export interface Availability {
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
}

export type DecisionCategory =
  | 'hard'
  | 'soft'
  | 'pair'
  | 'surrender'
  | 'deviation'
  | 'insurance'

export interface CorrectPlay {
  action: Action
  source: 'basic' | 'deviation'
  deviationId?: string
}

export interface Explanation {
  headline: string
  body: string
}

export interface GradedDecision {
  chosen: Action | 'take-insurance' | 'decline-insurance'
  correct: Action | 'take-insurance' | 'decline-insurance'
  wasCorrect: boolean
  /** null for insurance decisions */
  key: HandKey | null
  dealerUp: Rank
  category: DecisionCategory
  source: 'basic' | 'deviation'
  trueCountAtDecision?: number
  hinted: boolean
  /** true when the deal was stacked toward a trouble spot by drill mode */
  drilled?: boolean
  /**
   * True when this decision replays one the player rewound. It is graded and
   * explained like any other, but not recorded — the original stands on the
   * record, so a rewind can't be used to retry a spot into a better score.
   */
  replayed?: boolean
  explanation: Explanation
}

export function handKeyToString(key: HandKey): string {
  switch (key.kind) {
    case 'hard':
      return `hard${key.total}`
    case 'soft':
      return `soft${key.total}`
    case 'pair':
      return `pair${key.rank}`
  }
}

/** Human-readable label, e.g. "hard 16", "soft 18 (A,7)", "pair of 8s" */
export function handKeyLabel(key: HandKey): string {
  switch (key.kind) {
    case 'hard':
      return `hard ${key.total}`
    case 'soft':
      return `soft ${key.total} (A,${key.total - 11})`
    case 'pair':
      return key.rank === 'A' ? 'pair of aces' : `pair of ${key.rank}s`
  }
}
