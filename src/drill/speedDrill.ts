import type { Card } from '../engine/types'
import { buildShoe, shuffle } from '../engine/cards'
import type { CountSystem } from '../counting/systems'
import { COUNT_SYSTEMS, countRanks } from '../counting/systems'

/**
 * Count speed drill: a stream of cards at a fixed tempo, then "what's the
 * running count?". Pure setup + scoring; the component owns the timer.
 */
export type DrillSpeed = 'relaxed' | 'table' | 'fast' | 'brutal'

export interface SpeedOption {
  id: DrillSpeed
  label: string
  /** milliseconds each card is on screen */
  ms: number
  detail: string
}

export const SPEEDS: SpeedOption[] = [
  { id: 'relaxed', label: 'Relaxed', ms: 1200, detail: 'Learning the tags' },
  { id: 'table', label: 'Table pace', ms: 800, detail: 'About how fast cards land at a full table' },
  { id: 'fast', label: 'Fast', ms: 500, detail: 'A quick dealer on a short table' },
  { id: 'brutal', label: 'Brutal', ms: 280, detail: 'Faster than any real game' },
]

export const DECK_SIZES = [26, 52, 104] as const

export interface SpeedDrillRun {
  cards: Card[]
  answer: number
}

/**
 * Deal `count` cards off a freshly shuffled deck (seeded for reproducibility).
 * The answer is the running count in whichever system the player is training,
 * starting from zero — this drills the tags, not the shoe's IRC.
 */
export function buildSpeedDrill(
  count: number,
  seed: number,
  system: CountSystem = COUNT_SYSTEMS.hilo
): SpeedDrillRun {
  const decks = Math.ceil(count / 52)
  const { cards } = shuffle(buildShoe(decks), seed)
  const run = cards.slice(0, count)
  return { cards: run, answer: countRanks(system, run.map((c) => c.rank)) }
}

export interface SpeedDrillScore {
  correct: boolean
  off: number
  xp: number
  /** cards per minute actually sustained */
  pace: number
}

export function scoreSpeedDrill(
  answer: number,
  actual: number,
  cardCount: number,
  msPerCard: number
): SpeedDrillScore {
  const off = answer - actual
  const correct = off === 0
  // Faster tempo and longer runs are worth more; a miss still pays a little
  // for the effort so practice is never a dead loss.
  const speedFactor = 1200 / msPerCard
  const xp = correct ? Math.round(8 + (cardCount / 26) * 6 * speedFactor) : 2
  return { correct, off, xp, pace: Math.round(60000 / msPerCard) }
}
