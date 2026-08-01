import { describe, expect, it } from 'vitest'
import { emptyStats } from '../stats/model'
import type { DecisionRecord } from '../stats/model'
import { skillForDecision, xpForDecision, skillLevel, playerRank, skillForm } from './skills'
import { evaluateAchievements, ACHIEVEMENTS } from './achievements'

function decision(over: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    t: 1000, mode: 'basic', keyStr: 'hard16', keyLabel: 'hard 16', up: '10',
    chosen: 'hit', correct: 'hit', wasCorrect: true,
    category: 'hard', source: 'basic', hinted: false, ...over,
  }
}

describe('skillForDecision', () => {
  it('routes each decision to exactly one skill', () => {
    expect(skillForDecision(decision())).toBe('hard')
    expect(skillForDecision(decision({ category: 'soft' }))).toBe('soft')
    expect(skillForDecision(decision({ category: 'pair', chosen: 'split', correct: 'split' }))).toBe('pairs')
    expect(skillForDecision(decision({ correct: 'double' }))).toBe('doubles')
    expect(skillForDecision(decision({ category: 'soft', chosen: 'double', correct: 'hit' }))).toBe('doubles')
    expect(skillForDecision(decision({ category: 'surrender', correct: 'surrender' }))).toBe('defense')
    expect(skillForDecision(decision({ category: 'insurance', chosen: 'decline-insurance', correct: 'decline-insurance' }))).toBe('defense')
    expect(skillForDecision(decision({ category: 'deviation', correct: 'stand' }))).toBe('countplay')
  })
})

describe('xpForDecision', () => {
  it('pays correct plays, boosts drills and streaks, tokenizes hints', () => {
    expect(xpForDecision({ wasCorrect: true, hinted: false, drilled: false, streakAfter: 1 })).toBe(10)
    expect(xpForDecision({ wasCorrect: true, hinted: false, drilled: true, streakAfter: 1 })).toBe(14)
    expect(xpForDecision({ wasCorrect: true, hinted: false, drilled: false, streakAfter: 10 })).toBe(14)
    expect(xpForDecision({ wasCorrect: true, hinted: false, drilled: false, streakAfter: 50 })).toBe(20) // bonus caps
    expect(xpForDecision({ wasCorrect: false, hinted: false, drilled: false, streakAfter: 0 })).toBe(1)
    expect(xpForDecision({ wasCorrect: true, hinted: true, drilled: false, streakAfter: 5 })).toBe(3)
  })
})

describe('levels and ranks', () => {
  it('level thresholds are monotonic with titles', () => {
    expect(skillLevel(0)).toMatchObject({ level: 1, title: 'Novice' })
    expect(skillLevel(59).level).toBe(1)
    expect(skillLevel(60)).toMatchObject({ level: 2, title: 'Apprentice' })
    expect(skillLevel(1800)).toMatchObject({ level: 6, title: 'Master', ceiling: null, progress: 1 })
  })

  it('player rank sums all skill XP', () => {
    expect(playerRank({})).toMatchObject({ title: 'Tourist' })
    expect(playerRank({ hard: 200, soft: 150 })).toMatchObject({ title: 'Weekend Player' })
    expect(playerRank({ hard: 9000, count: 4000 })).toMatchObject({ title: 'Boss of the Pit' })
  })
})

describe('skillForm', () => {
  it('reports rolling accuracy and on-form status', () => {
    const stats = emptyStats()
    stats.decisions = [
      ...Array.from({ length: 10 }, () => decision({ wasCorrect: false })), // old misses
      ...Array.from({ length: 25 }, () => decision()), // recent perfection
    ]
    const form = skillForm(stats, 'hard')
    expect(form.seen).toBe(35)
    expect(form.pct).toBe(100) // window covers only the recent 25
    expect(form.onForm).toBe(true)
  })

  it('needs volume before granting on-form', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 5 }, () => decision())
    expect(skillForm(stats, 'hard').onForm).toBe(false)
  })
})

describe('achievements', () => {
  it('every achievement id is unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('earns streak and volume badges from stats', () => {
    const stats = emptyStats()
    stats.streak = { current: 12, best: 12 }
    stats.handsPlayed = 1
    stats.decisions = Array.from({ length: 30 }, () => decision())
    const earned = evaluateAchievements(stats)
    expect(earned).toContain('streak-10')
    expect(earned).toContain('book-25')
    expect(earned).toContain('first-hand')
    expect(earned).not.toContain('streak-25')
  })

  it('does not re-earn unlocked achievements', () => {
    const stats = emptyStats()
    stats.streak = { current: 12, best: 12 }
    stats.achievements = { 'streak-10': 123 }
    expect(evaluateAchievements(stats)).not.toContain('streak-10')
  })

  it('comeback fires on a $200 recovery from the low', () => {
    const stats = emptyStats()
    stats.bankrollHistory = [500, 350, 280, 400, 495]
    expect(evaluateAchievements(stats)).toContain('comeback')
    stats.bankrollHistory = [500, 400, 450]
    expect(evaluateAchievements(stats)).not.toContain('comeback')
  })

  it('courage badge requires the actual 8s-into-10 split', () => {
    const stats = emptyStats()
    stats.decisions = [
      decision({ keyStr: 'pair8', up: '10', chosen: 'split', correct: 'split', category: 'pair' }),
    ]
    expect(evaluateAchievements(stats)).toContain('split-8s-vs-ten')
  })
})
