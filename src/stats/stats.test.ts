import { describe, expect, it } from 'vitest'
import type { DecisionRecord, HandOutcomeRecord } from './model'
import { emptyStats, pushCapped } from './model'
import { overallAccuracy, topMistakes, outcomeMatrix, worstMatchups, startBucket } from './analysis'
import { coachTips, coachReport } from './coach'

function decision(over: Partial<DecisionRecord>): DecisionRecord {
  return {
    t: 1000,
    mode: 'basic',
    keyStr: 'hard16',
    keyLabel: 'hard 16',
    up: '10',
    chosen: 'hit',
    correct: 'hit',
    wasCorrect: true,
    category: 'hard',
    source: 'basic',
    hinted: false,
    ...over,
  }
}

function outcome(over: Partial<HandOutcomeRecord>): HandOutcomeRecord {
  return {
    t: 1000,
    mode: 'basic',
    startKeyStr: 'hard16',
    startLabel: 'hard 16',
    up: '10',
    result: 'lose',
    net: -15,
    bet: 15,
    wasSplitHand: false,
    ...over,
  }
}

describe('accuracy and mistakes', () => {
  it('hinted plays are excluded from accuracy', () => {
    const stats = emptyStats()
    stats.decisions = [
      decision({ wasCorrect: true }),
      decision({ wasCorrect: false }),
      decision({ wasCorrect: false, hinted: true }), // assisted: ignored
    ]
    expect(overallAccuracy(stats)).toMatchObject({ seen: 2, correct: 1, pct: 50 })
  })

  it('topMistakes surfaces the most-repeated specific error', () => {
    const stats = emptyStats()
    stats.decisions = [
      ...Array.from({ length: 5 }, () =>
        decision({ chosen: 'hit', correct: 'surrender', wasCorrect: false, category: 'surrender' })
      ),
      decision({ keyStr: 'soft18', keyLabel: 'soft 18 (A,7)', up: '9', chosen: 'stand', correct: 'hit', wasCorrect: false, category: 'soft' }),
    ]
    const top = topMistakes(stats, 3)
    expect(top[0]).toMatchObject({
      keyStr: 'hard16',
      up: '10',
      wrong: 5,
      correctAction: 'surrender',
      mostCommonWrongAction: 'hit',
    })
    // soft18 cell seen only once: below minSeen, excluded
    expect(top.find((m) => m.keyStr === 'soft18')).toBeUndefined()
  })
})

describe('outcome trends', () => {
  it('buckets starting hands sensibly', () => {
    expect(startBucket('hard16')).toBe('hard 12-16')
    expect(startBucket('hard11')).toBe('hard 9-11')
    expect(startBucket('soft18')).toBe('soft hands')
    expect(startBucket('pairA')).toBe('pairs')
    expect(startBucket('hard21')).toBe('blackjack/21')
  })

  it('aggregates wins/losses/net per bucket and upcard', () => {
    const outcomes = [
      outcome({ net: -15 }),
      outcome({ net: -15 }),
      outcome({ net: 15, result: 'win' }),
      outcome({ up: '6', startKeyStr: 'hard20', net: 15, result: 'win' }),
    ]
    const m = outcomeMatrix(outcomes)
    expect(m['hard 12-16']['10']).toMatchObject({ n: 3, wins: 1, losses: 2, net: -15 })
    expect(m['hard 17-20']['6']).toMatchObject({ n: 1, wins: 1 })
  })

  it('worstMatchups flags spots running below expectation', () => {
    // 20 hands of hard 12-16 vs 10, all losses: far below the ~-0.40 expected EV
    const outcomes = Array.from({ length: 20 }, () => outcome({ net: -15 }))
    const worst = worstMatchups(outcomes, 3, 8)
    expect(worst[0]).toMatchObject({ bucket: 'hard 12-16', up: '10', underperforming: true })
  })

  it('near-expectation losses are not flagged as leaks', () => {
    // ~46% wins vs 10 with 17-20: close to expectation
    const outcomes = [
      ...Array.from({ length: 11 }, () => outcome({ startKeyStr: 'hard19', net: -15 })),
      ...Array.from({ length: 10 }, () => outcome({ startKeyStr: 'hard19', net: 15, result: 'win' })),
    ]
    const worst = worstMatchups(outcomes, 3, 8)
    expect(worst[0]?.underperforming ?? false).toBe(false)
  })
})

describe('coach', () => {
  it('fires the missed-doubles tendency with examples from history', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 5 }, () =>
      decision({ keyStr: 'hard11', keyLabel: 'hard 11', up: '6', chosen: 'hit', correct: 'double', wasCorrect: false })
    )
    const tips = coachTips(stats)
    const doubles = tips.find((t) => t.id === 'missed-doubles')
    expect(doubles).toBeDefined()
    expect(doubles!.bucket).toBe('missed-opportunity')
    expect(doubles!.tip).toMatch(/hard 11 vs 6/)
  })

  it('does not fire below the occurrence threshold', () => {
    const stats = emptyStats()
    stats.decisions = [
      decision({ chosen: 'hit', correct: 'double', wasCorrect: false }),
      ...Array.from({ length: 20 }, () => decision({ correct: 'double', chosen: 'double', wasCorrect: true })),
    ]
    expect(coachTips(stats).find((t) => t.id === 'missed-doubles')).toBeUndefined()
  })

  it('report names a focus area and separates leaks from hard spots', () => {
    const stats = emptyStats()
    stats.decisions = [
      ...Array.from({ length: 12 }, () =>
        decision({ keyStr: 'pair8', keyLabel: 'pair of 8s', category: 'pair', chosen: 'hit', correct: 'split', wasCorrect: false })
      ),
      ...Array.from({ length: 12 }, () => decision({ wasCorrect: true })),
    ]
    const report = coachReport(stats)
    expect(report.focus).toMatch(/pairs/)
  })
})

describe('ring buffer', () => {
  it('caps and drops the oldest', () => {
    let arr: number[] = []
    for (let i = 0; i < 10; i++) arr = pushCapped(arr, i, 5)
    expect(arr).toEqual([5, 6, 7, 8, 9])
  })
})
