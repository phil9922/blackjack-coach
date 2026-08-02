import { describe, expect, it } from 'vitest'
import { buildHandLog, handLogToCsv } from './handLog'
import { emptyStats, DECISION_CAP } from './model'
import type { StatsState, DecisionRecord, HandOutcomeRecord } from './model'

const decision = (t: number, over: Partial<DecisionRecord> = {}): DecisionRecord => ({
  t,
  mode: 'basic',
  keyStr: 'hard16',
  keyLabel: 'hard 16',
  up: '10',
  chosen: 'stand',
  correct: 'hit',
  wasCorrect: false,
  category: 'hard',
  source: 'basic',
  hinted: false,
  ...over,
})

const outcome = (t: number, over: Partial<HandOutcomeRecord> = {}): HandOutcomeRecord => ({
  t,
  mode: 'basic',
  startKeyStr: 'hard16',
  startLabel: 'hard 16',
  up: '10',
  result: 'lose',
  net: -15,
  bet: 15,
  wasSplitHand: false,
  ...over,
})

/** Minimal RFC4180 reader, so the escaping test checks real parseability. */
function parseCsvRow(row: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const c = row[i]
    if (inQuotes) {
      if (c === '"' && row[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { cells.push(cur); cur = '' }
    else cur += c
  }
  cells.push(cur)
  return cells
}

function withHistory(decisions: DecisionRecord[], outcomes: HandOutcomeRecord[]): StatsState {
  return { ...emptyStats(), decisions, outcomes }
}

describe('hand log', () => {
  it('attaches each decision to the round it was played in', () => {
    const log = buildHandLog(
      withHistory(
        [decision(100), decision(200), decision(1100)],
        [outcome(1000), outcome(2000)]
      )
    )
    expect(log.rounds).toHaveLength(2)
    expect(log.rounds[0].decisions).toHaveLength(2)
    expect(log.rounds[1].decisions).toHaveLength(1)
  })

  it('groups the hands of a split into one round', () => {
    // A split settles several hands in the same pass, milliseconds apart.
    const log = buildHandLog(
      withHistory(
        [decision(50, { chosen: 'split', correct: 'split', wasCorrect: true })],
        [outcome(1000, { wasSplitHand: true }), outcome(1001, { wasSplitHand: true, net: 15, result: 'win' })]
      )
    )
    expect(log.rounds).toHaveLength(1)
    expect(log.rounds[0].hands).toHaveLength(2)
    // round totals sum the split hands
    expect(log.rounds[0].bet).toBe(30)
    expect(log.rounds[0].net).toBe(0)
  })

  it('does not group hands that are merely close in time but separate rounds', () => {
    const log = buildHandLog(withHistory([], [outcome(1000), outcome(1200)]))
    expect(log.rounds).toHaveLength(2)
  })

  it('places a decision that precedes the first outcome — it is that round s play', () => {
    const log = buildHandLog(withHistory([decision(10), decision(1100)], [outcome(1000)]))
    expect(log.rounds[0].decisions).toHaveLength(1)
    expect(log.unplacedDecisions).toBe(1) // the one at t=1100, still in progress
  })

  it('counts decisions from a hand still in progress rather than dropping them', () => {
    const log = buildHandLog(withHistory([decision(2000), decision(2100)], [outcome(1000)]))
    expect(log.rounds).toHaveLength(1)
    expect(log.rounds[0].decisions).toHaveLength(0)
    expect(log.unplacedDecisions).toBe(2)
  })

  it('flags truncation from the caps, since the log is then only the recent past', () => {
    const short = buildHandLog(withHistory([decision(10)], [outcome(1000)]))
    expect(short.truncated).toBe(false)

    const full = withHistory(
      Array.from({ length: DECISION_CAP }, (_, i) => decision(i + 1)),
      [outcome(DECISION_CAP + 10)]
    )
    expect(buildHandLog(full).truncated).toBe(true)
  })

  it('is empty and safe on a fresh profile', () => {
    const log = buildHandLog(emptyStats())
    expect(log.rounds).toEqual([])
    expect(handLogToCsv(log).split('\n')).toHaveLength(1) // headers only
  })

  it('writes one CSV row per settled hand, with the round s plays alongside', () => {
    const csv = handLogToCsv(
      buildHandLog(
        withHistory(
          [decision(100), decision(200, { chosen: 'hit', correct: 'hit', wasCorrect: true })],
          [outcome(1000)]
        )
      )
    )
    const rows = csv.split('\n')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('starting_hand')
    expect(rows[1]).toContain('hard 16')
    expect(rows[1]).toContain('book: hit')
    // one wrong play, one right: the misplay column is the last cell
    expect(rows[1].endsWith(',1')).toBe(true)
  })

  it('escapes commas and quotes so the CSV cannot be broken by a label', () => {
    const csv = handLogToCsv(
      buildHandLog(
        withHistory(
          [decision(100, { keyLabel: 'pair 8,8', chosen: 'say "no"' })],
          [outcome(1000, { startLabel: 'pair 8,8' })]
        )
      )
    )
    const row = csv.split('\n')[1]
    expect(row).toContain('"pair 8,8"')
    expect(row).toContain('""no""')
    // A naive split on commas would over-count; a correct CSV parse must still
    // see exactly the declared number of columns.
    expect(parseCsvRow(row)).toHaveLength(11)
  })

  it('marks hinted and drilled plays, so the log explains its own asterisks', () => {
    const csv = handLogToCsv(
      buildHandLog(
        withHistory([decision(100, { hinted: true, drilled: true })], [outcome(1000)])
      )
    )
    expect(csv).toContain('[hinted, drilled]')
  })
})
