import type { Rank } from '../engine/types'
import type { DecisionCategory } from '../strategy/types'
import type { DecisionRecord, HandOutcomeRecord, StatsState } from './model'

export interface Accuracy {
  seen: number
  correct: number
  pct: number | null
}

function acc(records: { wasCorrect: boolean }[]): Accuracy {
  const seen = records.length
  const correct = records.filter((r) => r.wasCorrect).length
  return { seen, correct, pct: seen ? Math.round((correct / seen) * 100) : null }
}

/** Hinted plays are "assisted" — excluded from real accuracy. */
export function unassisted(decisions: DecisionRecord[]): DecisionRecord[] {
  return decisions.filter((d) => !d.hinted)
}

export function overallAccuracy(stats: StatsState): Accuracy {
  return acc(unassisted(stats.decisions))
}

export function accuracyByCategory(stats: StatsState): Record<DecisionCategory, Accuracy> {
  const cats: DecisionCategory[] = ['hard', 'soft', 'pair', 'surrender', 'deviation', 'insurance']
  const out = {} as Record<DecisionCategory, Accuracy>
  const ds = unassisted(stats.decisions)
  for (const cat of cats) out[cat] = acc(ds.filter((d) => d.category === cat))
  return out
}

export interface CellMistake {
  keyStr: string
  keyLabel: string
  up: Rank
  seen: number
  wrong: number
  correctAction: string
  mostCommonWrongAction: string
}

/** The user's most-repeated specific mistakes, e.g. "hitting 16 vs 10". */
export function topMistakes(stats: StatsState, n = 5, minSeen = 3): CellMistake[] {
  const cells = new Map<string, DecisionRecord[]>()
  for (const d of unassisted(stats.decisions)) {
    const k = `${d.keyStr}|${d.up}`
    cells.set(k, [...(cells.get(k) ?? []), d])
  }
  const out: CellMistake[] = []
  for (const records of cells.values()) {
    const wrong = records.filter((r) => !r.wasCorrect)
    if (records.length < minSeen || wrong.length === 0) continue
    const wrongCounts = new Map<string, number>()
    for (const w of wrong) wrongCounts.set(w.chosen, (wrongCounts.get(w.chosen) ?? 0) + 1)
    const mostCommon = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const last = records[records.length - 1]
    out.push({
      keyStr: last.keyStr,
      keyLabel: last.keyLabel,
      up: last.up,
      seen: records.length,
      wrong: wrong.length,
      correctAction: wrong[wrong.length - 1].correct,
      mostCommonWrongAction: mostCommon,
    })
  }
  return out.sort((a, b) => b.wrong - a.wrong || b.wrong / b.seen - a.wrong / a.seen).slice(0, n)
}

// --- hand outcome trends ----------------------------------------------------

export type StartBucket =
  | 'hard 5-8'
  | 'hard 9-11'
  | 'hard 12-16'
  | 'hard 17-20'
  | 'soft hands'
  | 'pairs'
  | 'blackjack/21'

export function startBucket(startKeyStr: string): StartBucket {
  if (startKeyStr.startsWith('pair')) return 'pairs'
  if (startKeyStr.startsWith('soft')) {
    return startKeyStr === 'soft21' ? 'blackjack/21' : 'soft hands'
  }
  const total = Number(startKeyStr.replace('hard', ''))
  if (total === 21) return 'blackjack/21'
  if (total <= 8) return 'hard 5-8'
  if (total <= 11) return 'hard 9-11'
  if (total <= 16) return 'hard 12-16'
  return 'hard 17-20'
}

export const BUCKETS: StartBucket[] = [
  'hard 5-8', 'hard 9-11', 'hard 12-16', 'hard 17-20', 'soft hands', 'pairs', 'blackjack/21',
]
export const UP_ORDER: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']

export interface MatrixCell {
  n: number
  wins: number
  losses: number
  pushes: number
  net: number
  /** net per unit bet, the comparable number */
  evPerBet: number | null
}

export type OutcomeMatrix = Record<StartBucket, Partial<Record<Rank, MatrixCell>>>

export function outcomeMatrix(outcomes: HandOutcomeRecord[]): OutcomeMatrix {
  const matrix = {} as OutcomeMatrix
  for (const b of BUCKETS) matrix[b] = {}
  for (const o of outcomes) {
    const bucket = startBucket(o.startKeyStr)
    const cell = (matrix[bucket][o.up] ??= { n: 0, wins: 0, losses: 0, pushes: 0, net: 0, evPerBet: null })
    cell.n++
    cell.net += o.net
    if (o.net > 0) cell.wins++
    else if (o.net < 0) cell.losses++
    else cell.pushes++
  }
  for (const b of BUCKETS) {
    for (const up of UP_ORDER) {
      const cell = matrix[b][up]
      if (cell) {
        const totalBet = outcomes
          .filter((o) => startBucket(o.startKeyStr) === b && o.up === up)
          .reduce((s, o) => s + o.bet, 0)
        cell.evPerBet = totalBet > 0 ? cell.net / totalBet : null
      }
    }
  }
  return matrix
}

/**
 * Approximate expected net per unit bet for a starting bucket vs dealer group,
 * playing perfect basic strategy (rounded from published 6D H17 EV tables).
 * Used to separate "blackjack is just hard here" from "you are leaking money".
 */
const EXPECTED_EV: Record<StartBucket, { weak: number; strong: number }> = {
  'hard 5-8':    { weak: 0.05,  strong: -0.25 },
  'hard 9-11':   { weak: 0.35,  strong: 0.05 },
  'hard 12-16':  { weak: -0.15, strong: -0.40 },
  'hard 17-20':  { weak: 0.40,  strong: 0.05 },
  'soft hands':  { weak: 0.15,  strong: -0.10 },
  'pairs':       { weak: 0.15,  strong: -0.15 },
  'blackjack/21':{ weak: 1.30,  strong: 1.10 },
}

export function expectedEv(bucket: StartBucket, up: Rank): number {
  const strong = ['7', '8', '9', '10', 'A'].includes(up)
  return EXPECTED_EV[bucket][strong ? 'strong' : 'weak']
}

export interface Matchup {
  bucket: StartBucket
  up: Rank
  n: number
  lossRate: number
  evPerBet: number
  expectedEvPerBet: number
  /** negative = doing worse than perfect play expects */
  evGap: number
  underperforming: boolean
}

/** Where the user actually loses, ranked by how far below expectation they run. */
export function worstMatchups(outcomes: HandOutcomeRecord[], n = 5, minHands = 8): Matchup[] {
  const matrix = outcomeMatrix(outcomes)
  const out: Matchup[] = []
  for (const bucket of BUCKETS) {
    for (const up of UP_ORDER) {
      const cell = matrix[bucket][up]
      if (!cell || cell.n < minHands || cell.evPerBet === null) continue
      const expected = expectedEv(bucket, up)
      const gap = cell.evPerBet - expected
      out.push({
        bucket,
        up,
        n: cell.n,
        lossRate: cell.losses / cell.n,
        evPerBet: cell.evPerBet,
        expectedEvPerBet: expected,
        evGap: gap,
        underperforming: gap < -0.15,
      })
    }
  }
  return out.sort((a, b) => a.evGap - b.evGap).slice(0, n)
}

// --- trends -----------------------------------------------------------------

export interface TrendPoint {
  label: string
  accuracy: Accuracy
}

/** Accuracy over consecutive buckets of decisions (oldest first). */
export function accuracyTrend(stats: StatsState, bucketSize = 50): TrendPoint[] {
  const ds = unassisted(stats.decisions)
  const points: TrendPoint[] = []
  for (let i = 0; i < ds.length; i += bucketSize) {
    const slice = ds.slice(i, i + bucketSize)
    if (slice.length < Math.min(bucketSize, 10)) continue
    points.push({ label: `${i + 1}-${i + slice.length}`, accuracy: acc(slice) })
  }
  return points
}

export function profitLoss(stats: StatsState, currentBankroll: number, totalBuyIn: number) {
  return {
    bankroll: currentBankroll,
    totalBuyIn,
    net: currentBankroll - totalBuyIn,
    handsPlayed: stats.handsPlayed,
  }
}
