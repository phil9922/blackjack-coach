import { describe, expect, it } from 'vitest'
import type { Card, Rank } from '../engine/types'
import { gradeDecision, gradeInsurance } from './grade'
import type { Availability } from './types'

const c = (rank: Rank): Card => ({ rank, suit: '♦' })
const FULL: Availability = { canDouble: true, canSplit: true, canSurrender: true }
const NO_SURRENDER: Availability = { ...FULL, canSurrender: false }

describe('gradeDecision', () => {
  it('confirms a correct play with an explanation', () => {
    const g = gradeDecision({
      chosen: 'stand', cards: [c('10'), c('9')], dealerUp: '6',
      av: FULL, mode: 'basic', trueCount: 0, hinted: false,
    })
    expect(g.wasCorrect).toBe(true)
    expect(g.category).toBe('hard')
    expect(g.explanation.headline).toMatch(/^Correct/)
    expect(g.explanation.body.length).toBeGreaterThan(40)
  })

  it('flags a mistake and names the right play', () => {
    const g = gradeDecision({
      chosen: 'stand', cards: [c('A'), c('7')], dealerUp: '10',
      av: FULL, mode: 'basic', trueCount: 0, hinted: false,
    })
    expect(g.wasCorrect).toBe(false)
    expect(g.correct).toBe('hit')
    expect(g.category).toBe('soft')
    expect(g.explanation.body).toMatch(/soft 18/i)
  })

  it('surrender-correct spots are categorized as surrender', () => {
    const g = gradeDecision({
      chosen: 'hit', cards: [c('10'), c('6')], dealerUp: '10',
      av: FULL, mode: 'basic', trueCount: 0, hinted: false,
    })
    expect(g.correct).toBe('surrender')
    expect(g.category).toBe('surrender')
  })

  it('with surrender off, 16 vs 10 grades hit as correct', () => {
    const g = gradeDecision({
      chosen: 'hit', cards: [c('10'), c('6')], dealerUp: '10',
      av: NO_SURRENDER, mode: 'basic', trueCount: 0, hinted: false,
    })
    expect(g.wasCorrect).toBe(true)
    expect(g.category).toBe('hard')
  })

  it('deviation-driven grades carry count context', () => {
    const g = gradeDecision({
      chosen: 'hit', cards: [c('10'), c('6')], dealerUp: '10',
      av: NO_SURRENDER, mode: 'counting', trueCount: 2, hinted: false,
    })
    expect(g.correct).toBe('stand')
    expect(g.category).toBe('deviation')
    expect(g.explanation.body).toMatch(/count/i)
  })
})

describe('gradeInsurance', () => {
  it('declining is always correct in basic mode', () => {
    expect(gradeInsurance(false, 'basic', 0).wasCorrect).toBe(true)
    expect(gradeInsurance(true, 'basic', 0).wasCorrect).toBe(false)
  })

  it('taking is correct in counting mode at TC >= +3', () => {
    expect(gradeInsurance(true, 'counting', 3).wasCorrect).toBe(true)
    expect(gradeInsurance(true, 'counting', 2).wasCorrect).toBe(false)
    expect(gradeInsurance(false, 'counting', 4).wasCorrect).toBe(false)
  })
})
