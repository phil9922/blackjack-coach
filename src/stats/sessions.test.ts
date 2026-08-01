import { describe, expect, it } from 'vitest'
import { emptyStats } from './model'
import type { DecisionRecord, HandOutcomeRecord } from './model'
import { deriveSessions } from './sessions'
import { strengths } from './coach'

const HOUR = 60 * 60 * 1000

function decision(t: number, over: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    t, mode: 'basic', keyStr: 'hard16', keyLabel: 'hard 16', up: '10',
    chosen: 'hit', correct: 'hit', wasCorrect: true,
    category: 'hard', source: 'basic', hinted: false, ...over,
  }
}

function outcome(t: number, net: number): HandOutcomeRecord {
  return {
    t, mode: 'basic', startKeyStr: 'hard16', startLabel: 'hard 16', up: '10',
    result: net >= 0 ? 'win' : 'lose', net, bet: Math.abs(net) || 15, wasSplitHand: false,
  }
}

describe('deriveSessions', () => {
  it('splits history on 45-minute gaps, newest session first', () => {
    const stats = emptyStats()
    const day1 = 1_700_000_000_000
    const day2 = day1 + 24 * HOUR
    stats.decisions = [
      decision(day1), decision(day1 + 1000, { wasCorrect: false }),
      decision(day2), decision(day2 + 500), decision(day2 + 1000, { hinted: true }),
    ]
    stats.outcomes = [outcome(day1 + 2000, -15), outcome(day2 + 2000, 30)]

    const sessions = deriveSessions(stats)
    expect(sessions).toHaveLength(2)
    expect(sessions[0].start).toBeGreaterThan(sessions[1].start) // newest first
    expect(sessions[1]).toMatchObject({ decisions: 2, correct: 1, pct: 50, hands: 1, net: -15 })
    expect(sessions[0]).toMatchObject({ decisions: 2, correct: 2, pct: 100, hinted: 1, net: 30 })
  })

  it('names the session\'s most-repeated mistake', () => {
    const stats = emptyStats()
    const t0 = 1_700_000_000_000
    stats.decisions = [
      decision(t0, { wasCorrect: false }),
      decision(t0 + 1000, { wasCorrect: false }),
      decision(t0 + 2000, { keyStr: 'soft18', keyLabel: 'soft 18', up: '9', wasCorrect: false }),
    ]
    const [session] = deriveSessions(stats)
    expect(session.topIssue).toBe('hard 16 vs 10 (2× wrong)')
  })

  it('counts drilled plays', () => {
    const stats = emptyStats()
    stats.decisions = [decision(1000, { drilled: true }), decision(2000)]
    expect(deriveSessions(stats)[0].drilled).toBe(1)
  })
})

describe('strengths', () => {
  it('reports mastered categories and perfect trap cells', () => {
    const stats = emptyStats()
    stats.decisions = [
      ...Array.from({ length: 20 }, (_, i) => decision(1000 + i, { category: 'soft', keyStr: 'soft18', keyLabel: 'soft 18' })),
    ]
    const out = strengths(stats)
    expect(out.some((s) => s.title.includes('soft hands'))).toBe(true)
    expect(out.some((s) => s.title.includes('soft 18 vs 10'))).toBe(true)
  })

  it('detects improvement between early and recent play', () => {
    const stats = emptyStats()
    stats.decisions = [
      ...Array.from({ length: 10 }, (_, i) => decision(1000 + i, { category: 'pair', keyStr: 'pair8', keyLabel: 'pair of 8s', wasCorrect: i % 2 === 0 })),
      ...Array.from({ length: 10 }, (_, i) => decision(2000 + i, { category: 'pair', keyStr: 'pair8', keyLabel: 'pair of 8s', wasCorrect: true })),
    ]
    const out = strengths(stats)
    expect(out.some((s) => s.title.includes('Most improved: pairs'))).toBe(true)
  })

  it('stays quiet without volume', () => {
    const stats = emptyStats()
    stats.decisions = [decision(1000)]
    expect(strengths(stats)).toHaveLength(0)
  })
})
