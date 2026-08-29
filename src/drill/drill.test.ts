import { describe, expect, it } from 'vitest'
import type { Rank } from '../engine/types'
import { normalizeRank } from '../engine/cards'
import { evaluateHand } from '../engine/hand'
import { emptyStats } from '../stats/model'
import type { DecisionRecord } from '../stats/model'
import { buildDrillPlan, ranksForKey, drillTargets, type DrillPlan } from './planner'
import { initGame, gameReducer, userSeat, currentTrueCount, DEFAULT_SETTINGS } from '../engine/game'
import { DEFAULT_RULES } from '../engine/rules'
import { hiLoValue } from '../counting/hilo'

function mistake(keyStr: string, up: Rank, keyLabel = keyStr): DecisionRecord {
  return {
    t: 1000, mode: 'basic', keyStr, keyLabel, up,
    chosen: 'hit', correct: 'stand', wasCorrect: false,
    category: 'hard', source: 'basic', hinted: false,
  }
}

describe('ranksForKey', () => {
  it('produces hands that evaluate to their key', () => {
    for (let total = 5; total <= 19; total++) {
      const ranks = ranksForKey(`hard${total}`)!
      const v = evaluateHand(ranks.map((r) => ({ rank: r, suit: '♠' as const })))
      expect(v, `hard${total}`).toEqual({ total, soft: false })
      expect(normalizeRank(ranks[0])).not.toBe(normalizeRank(ranks[1])) // never an accidental pair
    }
    expect(ranksForKey('soft18')).toEqual(['A', '7'])
    expect(ranksForKey('pair8')).toEqual(['8', '8'])
    expect(ranksForKey('pairA')).toEqual(['A', 'A'])
    expect(ranksForKey('insurance')).toEqual(['10', '9'])
  })
})

describe('buildDrillPlan', () => {
  it('offers the curated trap pool when there is no history', () => {
    const plan = buildDrillPlan(emptyStats())
    const targeted = plan.spots.filter((s) => s.playerRanks !== null)
    expect(targeted.length).toBeGreaterThan(20)
    expect(plan.spots.some((s) => s.playerRanks === null)).toBe(true) // random escape present
  })

  it('weights the user\'s own repeated mistakes above the curated pool', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 8 }, () => mistake('hard16', '10', 'hard 16'))
    const plan = buildDrillPlan(stats)
    const top = drillTargets(plan, 1)[0]
    expect(top.label).toBe('hard 16 vs 10')
    expect(top.dealerUp).toBe('10')
    expect(top.playerRanks).toEqual(['10', '6'])
  })

  it('hinted plays do not feed the drill weights', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 8 }, () => ({ ...mistake('soft18', '9'), hinted: true }))
    const plan = buildDrillPlan(stats)
    const soft18 = plan.spots.find((s) => s.label === 'soft 18 vs 9')
    // present only at curated weight, not boosted by (hinted) mistakes
    const curatedWeights = plan.spots.filter((s) => s.label === 'hard 15 vs 10').map((s) => s.weight)
    expect(soft18?.weight).toBe(curatedWeights[0])
  })
})

describe('drill-mode dealing', () => {
  const plan: DrillPlan = {
    spots: [{ label: 'hard 16 vs 10', playerRanks: ['10', '6'], dealerUp: '10', weight: 1 }],
  }
  const settings = { ...DEFAULT_SETTINGS, drillMode: true }

  it('stacks the user hand and dealer upcard to the picked spot', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings, buyIn: 1000, seed: 42 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: plan })
    const cards = userSeat(s).hands[0].cards
    const ranks = cards.map((c) => normalizeRank(c.rank)).sort()
    expect(ranks).toEqual(['10', '6'].sort())
    expect(normalizeRank(s.dealerCards[0].rank)).toBe('10')
    expect(s.drilledLabel).toBe('hard 16 vs 10')
  })

  it('keeps the shoe an honest 312-card multiset after stacking', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings, buyIn: 1000, seed: 42 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: plan })
    expect(s.shoe).toHaveLength(312)
    const byRank = new Map<string, number>()
    for (const c of s.shoe) byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1)
    for (const count of byRank.values()) expect(count).toBe(24)
  })

  it('grades on drilled hands carry the drilled flag', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings, buyIn: 1000, seed: 42 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: plan })
    // dealer shows 10: peek may end the round on a dealer blackjack — re-deal until playable
    let guard = 0
    while (s.phase !== 'seatTurn' && guard++ < 10) {
      if (s.phase === 'roundOver') s = gameReducer(s, { type: 'NEXT_ROUND' })
      if (s.phase === 'betting') s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: plan })
    }
    expect(s.phase).toBe('seatTurn')
    s = gameReducer(s, { type: 'PLAYER_ACTION', action: 'hit' })
    expect(s.lastGrade?.drilled).toBe(true)
  })

  it('does not stack when drill mode is off, even if a plan is passed', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings: DEFAULT_SETTINGS, buyIn: 1000, seed: 123 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: plan })
    expect(s.drilledLabel).toBe(null)
  })
})

describe('deviation drills (counting mode)', () => {
  const countingSettings = { ...DEFAULT_SETTINGS, mode: 'counting' as const, drillMode: true }
  const devPlan = (targetTrueCount: number): DrillPlan => ({
    spots: [
      {
        label: `12 v 3 at TC ${targetTrueCount}`,
        playerRanks: ['10', '2'],
        dealerUp: '3',
        targetTrueCount,
        weight: 1,
      },
    ],
  })

  it('only builds count scenarios in counting mode', () => {
    const stats = emptyStats()
    expect(buildDrillPlan(stats, 'basic').spots.some((s) => s.targetTrueCount !== undefined)).toBe(false)
    const counting = buildDrillPlan(stats, 'counting').spots.filter((s) => s.targetTrueCount !== undefined)
    expect(counting.length).toBeGreaterThan(20)
    // both a live-index and a just-short variant per deviation
    expect(counting.some((s) => s.label.includes('hard 16 vs 10 at TC +0'))).toBe(true)
    expect(counting.some((s) => s.label.includes('hard 16 vs 10 at TC -1'))).toBe(true)
  })

  it('burns the shoe to put the decision at the target count', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings: countingSettings, buyIn: 1000, seed: 11 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: devPlan(2) })
    expect(s.burnedCards.length).toBeGreaterThan(0)
    expect(currentTrueCount(s)).toBe(2)
    expect(s.phase).toBe('seatTurn')
  })

  it('keeps the shoe and count honest while burning', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings: countingSettings, buyIn: 1000, seed: 11 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: devPlan(3) })
    // shoe is still a full 6-deck multiset — cards moved, none invented
    expect(s.shoe).toHaveLength(312)
    const byRank = new Map<string, number>()
    for (const c of s.shoe) byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1)
    for (const count of byRank.values()) expect(count).toBe(24)
    // running count equals the Hi-Lo sum of every card that has left the shoe,
    // minus the still-hidden hole card
    const dealt = s.shoe.slice(0, s.nextCard)
    const expected =
      dealt.reduce((sum, c) => sum + hiLoValue(c.rank), 0) - hiLoValue(s.dealerCards[1].rank)
    expect(s.runningCount).toBe(expected)
  })

  it('a live-index drill grades the deviation as correct', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings: countingSettings, buyIn: 1000, seed: 11 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: devPlan(2) })
    s = gameReducer(s, { type: 'PLAYER_ACTION', action: 'stand' }) // 12 v 3 stands at TC >= 2
    expect(s.lastGrade).toMatchObject({ wasCorrect: true, category: 'deviation' })
  })

  it('a just-short drill wants basic strategy, not the deviation', () => {
    let s = initGame({ rules: DEFAULT_RULES, settings: countingSettings, buyIn: 1000, seed: 11 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: devPlan(1) })
    expect(currentTrueCount(s)).toBe(1)
    s = gameReducer(s, { type: 'PLAYER_ACTION', action: 'stand' })
    expect(s.lastGrade).toMatchObject({ wasCorrect: false, correct: 'hit' })
  })

  it('a plain basic-strategy drill burns nothing', () => {
    const basicPlan: DrillPlan = {
      spots: [{ label: 'hard 16 vs 10', playerRanks: ['10', '6'], dealerUp: '10', weight: 1 }],
    }
    let s = initGame({ rules: DEFAULT_RULES, settings: countingSettings, buyIn: 1000, seed: 11 })
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25, drill: basicPlan })
    expect(s.burnedCards).toHaveLength(0)
  })
})
