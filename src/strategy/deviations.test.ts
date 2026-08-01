import { describe, expect, it } from 'vitest'
import type { Card, Rank } from '../engine/types'
import { DEVIATIONS, findDeviation } from './deviations'
import { getCorrectAction, deriveHandKey } from './lookup'
import type { Availability } from './types'

const FULL: Availability = { canDouble: true, canSplit: true, canSurrender: true }
const NO_SURRENDER: Availability = { ...FULL, canSurrender: false }
const c = (rank: Rank): Card => ({ rank, suit: '♠' })

describe('deviation thresholds fire exactly at their boundary', () => {
  for (const dev of DEVIATIONS) {
    // Test each entry under the surrender availability it applies to.
    const surrender = !!dev.onlyIfSurrender
    it(`${dev.id}: ${dev.dir} ${dev.threshold}`, () => {
      const at = findDeviation(dev.key, dev.dealerUp, dev.threshold, surrender)
      expect(at?.id).toBe(dev.id)
      const past =
        dev.dir === 'atOrAbove'
          ? findDeviation(dev.key, dev.dealerUp, dev.threshold + 1, surrender)
          : findDeviation(dev.key, dev.dealerUp, dev.threshold - 1, surrender)
      expect(past?.id).toBe(dev.id)
      const miss =
        dev.dir === 'atOrAbove'
          ? findDeviation(dev.key, dev.dealerUp, dev.threshold - 1, surrender)
          : findDeviation(dev.key, dev.dealerUp, dev.threshold + 1, surrender)
      expect(miss?.id).not.toBe(dev.id)
    })
  }
})

describe('H17-specific index values (locked to BJA-H17/Wong)', () => {
  const index = (id: string) => DEVIATIONS.find((d) => d.id === id)!
  it('10 vs A doubles at +3 (H17), not the S17 +4', () => {
    expect(index('I18-10vA')).toMatchObject({ threshold: 3, dir: 'atOrAbove' })
  })
  it('12 vs 6 hits only at -4 and below (H17 index -3)', () => {
    expect(index('I18-12v6')).toMatchObject({ threshold: -4, dir: 'atOrBelow' })
  })
  it('12 vs 5 hits at -2 and below (H17 index -1)', () => {
    expect(index('I18-12v5')).toMatchObject({ threshold: -2, dir: 'atOrBelow' })
  })
  it('13 vs 3 hits at -3 and below (index -2)', () => {
    expect(index('I18-13v3')).toMatchObject({ threshold: -3, dir: 'atOrBelow' })
  })
  it('12 vs 4 stands at 0, hits at any negative (index 0)', () => {
    expect(index('I18-12v4')).toMatchObject({ threshold: -1, dir: 'atOrBelow' })
  })
  it('11 vs A is basic strategy under H17 — no deviation entry exists', () => {
    expect(
      findDeviation({ kind: 'hard', total: 11 }, 'A', 5, false)
    ).toBe(null)
  })
})

describe('deviations integrate with lookup', () => {
  const sixteen = deriveHandKey([c('10'), c('6')], NO_SURRENDER)

  it('never fire in basic mode', () => {
    expect(getCorrectAction(sixteen, '10', NO_SURRENDER, 'basic', 5).action).not.toBe('stand')
  })

  it('16 vs 10 stands at TC >= 0 in counting mode (no surrender), falls back below', () => {
    expect(getCorrectAction(sixteen, '10', NO_SURRENDER, 'counting', 0)).toMatchObject({
      action: 'stand',
      source: 'deviation',
    })
    expect(getCorrectAction(sixteen, '10', NO_SURRENDER, 'counting', -1)).toMatchObject({
      action: 'hit',
      source: 'basic',
    })
  })

  it('with surrender available, surrendering 16 vs 10 stays correct at positive counts', () => {
    const key = deriveHandKey([c('10'), c('6')], FULL)
    expect(getCorrectAction(key, '10', FULL, 'counting', 2)).toMatchObject({
      action: 'surrender',
      source: 'basic',
    })
  })

  it('15 vs 10 with surrender: surrender at TC 0+, play on in negative shoes', () => {
    const key = deriveHandKey([c('10'), c('5')], FULL)
    expect(getCorrectAction(key, '10', FULL, 'counting', 0).action).toBe('surrender')
    expect(getCorrectAction(key, '10', FULL, 'counting', -1)).toMatchObject({
      action: 'hit',
      source: 'deviation',
    })
  })

  it('15 vs A under H17: surrender holds to -2, then hit', () => {
    const key = deriveHandKey([c('10'), c('5')], FULL)
    expect(getCorrectAction(key, 'A', FULL, 'counting', -1).action).toBe('surrender')
    expect(getCorrectAction(key, 'A', FULL, 'counting', -2)).toMatchObject({
      action: 'hit',
      source: 'deviation',
    })
  })

  it('illegal deviation actions fall through to basic strategy', () => {
    // 10 vs 10 doubles at TC >= 4, but a 3-card 10 can't double -> basic hit
    const bare: Availability = { canDouble: false, canSplit: false, canSurrender: false }
    const threeCardTen = deriveHandKey([c('2'), c('3'), c('5')], bare)
    expect(getCorrectAction(threeCardTen, '10', bare, 'counting', 5)).toMatchObject({
      action: 'hit',
      source: 'basic',
    })
  })

  it('12 vs 4 stands at TC 0 and hits when the count goes negative', () => {
    const twelve = deriveHandKey([c('10'), c('2')], NO_SURRENDER)
    expect(getCorrectAction(twelve, '4', NO_SURRENDER, 'counting', 0).action).toBe('stand')
    expect(getCorrectAction(twelve, '4', NO_SURRENDER, 'counting', -1).action).toBe('hit')
  })
})
