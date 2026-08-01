import { describe, expect, it } from 'vitest'
import { buildShoe } from '../engine/cards'
import { countCards, hiLoValue } from './hilo'
import { trueCount, trueCountExact } from './trueCount'
import { rampUnits, suggestBet } from '../betting/advisor'

describe('Hi-Lo', () => {
  it('a full shoe sums to zero (balanced count)', () => {
    expect(countCards(buildShoe(6))).toBe(0)
  })

  it('assigns the right tag to each group', () => {
    expect(hiLoValue('2')).toBe(1)
    expect(hiLoValue('6')).toBe(1)
    expect(hiLoValue('7')).toBe(0)
    expect(hiLoValue('9')).toBe(0)
    expect(hiLoValue('10')).toBe(-1)
    expect(hiLoValue('K')).toBe(-1)
    expect(hiLoValue('A')).toBe(-1)
  })
})

describe('true count', () => {
  it('divides by decks remaining and floors toward zero', () => {
    expect(trueCount(6, 156)).toBe(2) // +6 over 3 decks
    expect(trueCount(5, 104)).toBe(2) // 2.5 floors to 2
    expect(trueCount(-5, 104)).toBe(-2) // -2.5 floors toward zero
  })

  it('clamps decks remaining to half a deck near the cut card', () => {
    expect(trueCount(4, 10)).toBe(8) // 10 cards would be 0.19 decks; clamped to 0.5
    expect(trueCountExact(4, 26)).toBe(8)
  })
})

describe('bet advisor', () => {
  it('ramps 1/2/4/6/8 units by true count', () => {
    expect(rampUnits(-2)).toBe(1)
    expect(rampUnits(1)).toBe(1)
    expect(rampUnits(2)).toBe(2)
    expect(rampUnits(3)).toBe(4)
    expect(rampUnits(4)).toBe(6)
    expect(rampUnits(7)).toBe(8)
  })

  it('counting advice clamps to table limits and bankroll', () => {
    const a = suggestBet({ mode: 'counting', trueCount: 5, bankroll: 10_000, tableMin: 15, tableMax: 100 })
    expect(a.amount).toBe(100) // 8 units = 120, clamped to max
    const b = suggestBet({ mode: 'counting', trueCount: 5, bankroll: 60, tableMin: 15, tableMax: 1000 })
    expect(b.amount).toBe(60) // clamped to bankroll
  })

  it('basic advice is flat and explains why', () => {
    const a = suggestBet({ mode: 'basic', trueCount: 0, bankroll: 1000, tableMin: 15, tableMax: 1000 })
    expect(a.amount).toBe(15)
    expect(a.reason).toMatch(/flat/i)
  })
})
