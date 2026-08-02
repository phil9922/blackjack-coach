import { DECISION_CAP, OUTCOME_CAP } from './model'
import type { StatsState, DecisionRecord, HandOutcomeRecord } from './model'

/**
 * The hand log: what you played, how you played it, and what it cost.
 *
 * The app records decisions and settled hands separately — decisions as they are
 * graded, outcomes when the round settles. Neither carries a round id, so this
 * reassembles rounds from timestamps: every decision graded since the previous
 * settlement belongs to the round that settles next. That is exact in ordinary
 * play, because a decision is always graded before the round it belongs to
 * settles, and settlement is the only thing that writes outcomes.
 *
 * Two honest limits, surfaced rather than hidden:
 *  - A split settles several hands in one round. Those hands share the round's
 *    decisions, because the record does not say which hand each decision was on.
 *  - History is capped (DECISION_CAP / OUTCOME_CAP), so a long-running profile
 *    has had its oldest rounds dropped. `truncated` reports when that shows.
 */

export interface HandLogRound {
  /** 1-based, oldest first, within what history remains */
  round: number
  playedAt: string
  mode: string
  dealerUp: string
  /** one entry per settled hand — more than one when the round was split */
  hands: {
    startLabel: string
    bet: number
    result: string
    net: number
    wasSplitHand: boolean
  }[]
  decisions: {
    hand: string
    chose: string
    book: string
    correct: boolean
    hinted: boolean
    drilled: boolean
    trueCount?: number
  }[]
  bet: number
  net: number
}

export interface HandLog {
  rounds: HandLogRound[]
  /**
   * Decisions with no round to belong to — a hand still in progress when the
   * log was taken. Reported rather than dropped so the counts always reconcile.
   */
  unplacedDecisions: number
  /**
   * The history is at its cap, so older rounds have already been discarded and
   * this log is the recent past, not the whole of it.
   */
  truncated: boolean
}

function decisionRow(d: DecisionRecord): HandLogRound['decisions'][number] {
  return {
    hand: d.keyLabel,
    chose: d.chosen,
    book: d.correct,
    correct: d.wasCorrect,
    hinted: d.hinted,
    drilled: d.drilled ?? false,
    ...(d.tc === undefined ? {} : { trueCount: d.tc }),
  }
}

export function buildHandLog(stats: StatsState): HandLog {
  const outcomes = [...stats.outcomes].sort((a, b) => a.t - b.t)
  const decisions = [...stats.decisions].sort((a, b) => a.t - b.t)

  // Settlement writes every hand of a round in one pass, so hands within a few
  // milliseconds of each other are the same round.
  const rounds: HandOutcomeRecord[][] = []
  for (const o of outcomes) {
    const last = rounds[rounds.length - 1]
    if (last && o.t - last[last.length - 1].t <= 50) last.push(o)
    else rounds.push([o])
  }

  let cursor = 0
  const out: HandLogRound[] = []
  rounds.forEach((group, i) => {
    const settledAt = group[group.length - 1].t
    const mine: DecisionRecord[] = []
    while (cursor < decisions.length && decisions[cursor].t <= settledAt) {
      mine.push(decisions[cursor])
      cursor++
    }
    out.push({
      round: i + 1,
      playedAt: new Date(group[0].t).toISOString(),
      mode: group[0].mode,
      dealerUp: group[0].up,
      hands: group.map((h) => ({
        startLabel: h.startLabel,
        bet: h.bet,
        result: h.result,
        net: h.net,
        wasSplitHand: h.wasSplitHand,
      })),
      decisions: mine.map(decisionRow),
      bet: group.reduce((s, h) => s + h.bet, 0),
      net: group.reduce((s, h) => s + h.net, 0),
    })
  })

  return {
    rounds: out,
    // Whatever the cursor never consumed was played after the last settled
    // round — a hand still in progress.
    unplacedDecisions: decisions.length - cursor,
    // Truncation is a property of the caps, not of the timestamps: once either
    // array is full, the oldest entries have already been discarded.
    truncated:
      stats.decisions.length >= DECISION_CAP || stats.outcomes.length >= OUTCOME_CAP,
  }
}

function csvCell(value: string | number | boolean): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const HEADERS = [
  'round',
  'played_at',
  'mode',
  'dealer_up',
  'starting_hand',
  'bet',
  'result',
  'net',
  'from_split',
  'decisions',
  'misplays',
]

/**
 * One row per settled hand — the shape a spreadsheet wants. The round's plays
 * are collapsed into a readable column rather than exploded across rows, so
 * "what did I do and what did it cost" reads left to right.
 */
export function handLogToCsv(log: HandLog): string {
  const lines = [HEADERS.join(',')]
  for (const r of log.rounds) {
    const plays = r.decisions
      .map((d) => {
        const mark = d.correct ? '✓' : `✗ (book: ${d.book})`
        const tags = [d.hinted && 'hinted', d.drilled && 'drilled'].filter(Boolean).join(', ')
        return `${d.hand}: ${d.chose} ${mark}${tags ? ` [${tags}]` : ''}`
      })
      .join(' | ')
    const misplays = r.decisions.filter((d) => !d.correct).length
    for (const h of r.hands) {
      lines.push(
        [
          r.round,
          r.playedAt,
          r.mode,
          r.dealerUp,
          h.startLabel,
          h.bet,
          h.result,
          h.net,
          h.wasSplitHand,
          plays,
          misplays,
        ]
          .map(csvCell)
          .join(',')
      )
    }
  }
  return lines.join('\n')
}
