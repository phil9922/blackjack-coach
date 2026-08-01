import type { HandResult, Rank, TrainingMode } from '../engine/types'
import type { DecisionCategory } from '../strategy/types'

export interface DecisionRecord {
  t: number
  mode: TrainingMode
  /** strategy key string, e.g. "hard16", "soft18", "pairA", or "insurance" */
  keyStr: string
  keyLabel: string
  up: Rank
  chosen: string
  correct: string
  wasCorrect: boolean
  category: DecisionCategory
  source: 'basic' | 'deviation'
  hinted: boolean
  drilled?: boolean
  tc?: number
}

export interface HandOutcomeRecord {
  t: number
  mode: TrainingMode
  /** strategy key of the starting two cards, e.g. "hard16" */
  startKeyStr: string
  startLabel: string
  up: Rank
  result: HandResult
  net: number
  bet: number
  wasSplitHand: boolean
}

export interface QuizStats {
  asked: number
  rcCorrect: number
  tcCorrect: number
}

export interface BetAdviceStats {
  rounds: number
  followed: number
}

export interface XpEvent {
  skill: string
  amount: number
  t: number
}

export interface StatsState {
  schemaVersion: 1
  decisions: DecisionRecord[]
  outcomes: HandOutcomeRecord[]
  streak: { current: number; best: number }
  countQuizzes: QuizStats
  betAdvice: BetAdviceStats
  bankrollHistory: number[]
  handsPlayed: number
  /** lifetime XP per skill id — accumulates independently of the ring buffers */
  skillXp: Record<string, number>
  /** unlocked achievement id -> unlock timestamp */
  achievements: Record<string, number>
  /** the most recent XP grant, for in-game display */
  lastXp: XpEvent | null
}

export const DECISION_CAP = 1000
export const OUTCOME_CAP = 2000
export const BANKROLL_CAP = 500

export function emptyStats(): StatsState {
  return {
    schemaVersion: 1,
    decisions: [],
    outcomes: [],
    streak: { current: 0, best: 0 },
    countQuizzes: { asked: 0, rcCorrect: 0, tcCorrect: 0 },
    betAdvice: { rounds: 0, followed: 0 },
    bankrollHistory: [],
    handsPlayed: 0,
    skillXp: {},
    achievements: {},
    lastXp: null,
  }
}

export function pushCapped<T>(arr: T[], item: T, cap: number): T[] {
  const next = [...arr, item]
  return next.length > cap ? next.slice(next.length - cap) : next
}
