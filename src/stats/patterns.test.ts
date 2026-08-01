import { describe, expect, it } from 'vitest'
import { emptyStats } from './model'
import type { DecisionRecord, StatsState } from './model'
import type { Rank } from '../engine/types'
import { actionBreakdown, topMistakes } from './analysis'
import { coachTips } from './coach'

function d(over: Partial<DecisionRecord>): DecisionRecord {
  return {
    t: 1000, mode: 'basic', keyStr: 'hard16', keyLabel: 'hard 16', up: '10',
    chosen: 'hit', correct: 'hit', wasCorrect: true,
    category: 'hard', source: 'basic', hinted: false, ...over,
  }
}

/** Stood when the book said double — the classic soft-hand leak. */
function missedSoftDouble(soft: number, up: Rank): DecisionRecord {
  return d({
    keyStr: `soft${soft}`, keyLabel: `soft ${soft} (A,${soft - 11})`, up,
    chosen: 'stand', correct: 'double', wasCorrect: false, category: 'soft',
  })
}

/** Doubled a stiff because the dealer looked weak — the overcorrection. */
function badDouble(total: number, up: Rank): DecisionRecord {
  return d({
    keyStr: `hard${total}`, keyLabel: `hard ${total}`, up,
    chosen: 'double', correct: total >= 12 ? 'stand' : 'hit', wasCorrect: false,
  })
}

function goodHardDouble(total: number, up: Rank): DecisionRecord {
  return d({
    keyStr: `hard${total}`, keyLabel: `hard ${total}`, up,
    chosen: 'double', correct: 'double', wasCorrect: true,
  })
}

/**
 * The profile this app was measured against: strong on hard totals, weak on
 * soft doubles, and over-applying "weak dealer means double" to stiff hands.
 * The point of these tests is that the engine separates those three, rather
 * than reporting one blurred "doubling" score.
 */
function realisticProfile(): StatsState {
  const stats = emptyStats()
  stats.decisions = [
    // soft doubles: mostly missed, spread thin across cells so no single
    // cell repeats enough to look like a problem on its own
    missedSoftDouble(17, '4'), missedSoftDouble(17, '5'), missedSoftDouble(17, '6'),
    missedSoftDouble(18, '3'), missedSoftDouble(18, '4'), missedSoftDouble(18, '5'),
    missedSoftDouble(16, '6'), missedSoftDouble(15, '5'), missedSoftDouble(13, '6'),
    // hard doubles: reliably taken
    ...Array.from({ length: 12 }, (_, i) => goodHardDouble(11, String((i % 8) + 2) as Rank)),
    // but doubling leaked into hands too weak to double
    badDouble(14, '6'), badDouble(15, '5'), badDouble(12, '2'), badDouble(13, '4'),
    // solid hard-total play
    ...Array.from({ length: 30 }, () => d({ chosen: 'hit', correct: 'hit', wasCorrect: true })),
  ]
  return stats
}

describe('actionBreakdown separates kinds of error', () => {
  it('distinguishes soft doubles missed from hard doubles taken', () => {
    const b = actionBreakdown(realisticProfile())
    expect(b.softDoubles).toEqual({ offered: 9, taken: 0 })
    expect(b.hardDoubles.offered).toBe(12)
    expect(b.hardDoubles.taken).toBe(12)
  })

  it('counts doubles made wrongly separately from doubles missed', () => {
    const b = actionBreakdown(realisticProfile())
    expect(b.doubledWrongly).toBe(4)
    expect(b.doublesMade).toBe(16) // 12 correct + 4 wrong
  })

  it('counts standing on soft hands that should act', () => {
    const b = actionBreakdown(realisticProfile())
    expect(b.softHands.stoodWrongly).toBe(9)
  })

  it('hinted plays are excluded', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 5 }, () => ({
      ...missedSoftDouble(17, '5'),
      hinted: true,
    }))
    expect(actionBreakdown(stats).softDoubles.offered).toBe(0)
  })
})

describe('coach catches the patterns a blurred rule would miss', () => {
  const tips = coachTips(realisticProfile())
  const ids = tips.map((t) => t.id)

  it('names missed SOFT doubles specifically', () => {
    expect(ids).toContain('missed-soft-doubles')
    const tip = tips.find((t) => t.id === 'missed-soft-doubles')!
    expect(tip.tip).toMatch(/ace/i)
    expect(tip.examples.length).toBeGreaterThan(0)
  })

  it('does NOT accuse them of missing hard doubles, which they take reliably', () => {
    expect(ids).not.toContain('missed-hard-doubles')
  })

  it('catches over-doubling as a mistake, not a missed opportunity', () => {
    expect(ids).toContain('over-doubling')
    const tip = tips.find((t) => t.id === 'over-doubling')!
    expect(tip.bucket).toBe('mistake')
    // the fix is the missing half of the condition, not "double less"
    expect(tip.tip).toMatch(/one card/i)
  })

  it('a player who only misses hard doubles gets the hard-double tip instead', () => {
    const stats = emptyStats()
    stats.decisions = [
      ...Array.from({ length: 6 }, () =>
        d({ keyStr: 'hard11', keyLabel: 'hard 11', up: '6', chosen: 'hit', correct: 'double', wasCorrect: false })
      ),
      ...Array.from({ length: 10 }, () => d({ correct: 'double', chosen: 'double', wasCorrect: true, keyStr: 'soft17', keyLabel: 'soft 17', category: 'soft' })),
    ]
    const got = coachTips(stats).map((t) => t.id)
    expect(got).toContain('missed-hard-doubles')
    expect(got).not.toContain('missed-soft-doubles')
  })
})

describe('one-off misses across related cells stay visible', () => {
  it('every missed cell is retrievable even when none repeats', () => {
    const spread = topMistakes(realisticProfile(), 40, 1)
    const softSpots = spread.filter((m) => m.keyStr.startsWith('soft'))
    // nine distinct soft cells, each missed once — invisible at the default
    // minSeen of 3, which is exactly why the digest asks for minSeen 1
    expect(softSpots.length).toBe(9)
    expect(topMistakes(realisticProfile(), 40, 3).filter((m) => m.keyStr.startsWith('soft'))).toHaveLength(0)
  })
})
