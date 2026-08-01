import { describe, expect, it } from 'vitest'
import type { Card, Rank } from '../engine/types'
import { DEVIATIONS, findDeviation } from './deviations'
import { getCorrectAction, deriveHandKey } from './lookup'
import type { Availability } from './types'

const FULL: Availability = { canDouble: true, canSplit: true, canSurrender: true }
const c = (rank: Rank): Card => ({ rank, suit: '♠' })

describe('deviation thresholds fire exactly at their boundary', () => {
  for (const dev of DEVIATIONS) {
    it(`${dev.id}: ${dev.dir} ${dev.threshold}`, () => {
      const at = findDeviation(dev.key, dev.dealerUp, dev.threshold)
      expect(at?.id).toBe(dev.id)
      const past =
        dev.dir === 'atOrAbove'
          ? findDeviation(dev.key, dev.dealerUp, dev.threshold + 1)
          : findDeviation(dev.key, dev.dealerUp, dev.threshold - 1)
      expect(past?.id).toBe(dev.id)
      const miss =
        dev.dir === 'atOrAbove'
          ? findDeviation(dev.key, dev.dealerUp, dev.threshold - 1)
          : findDeviation(dev.key, dev.dealerUp, dev.threshold + 1)
      expect(miss?.id).not.toBe(dev.id)
    })
  }
})

describe('deviations integrate with lookup', () => {
  const sixteen = deriveHandKey([c('10'), c('6')], FULL)

  it('never fire in basic mode', () => {
    expect(getCorrectAction(sixteen, '10', FULL, 'basic', 5).action).not.toBe('stand')
  })

  it('16 vs 10 stands at TC >= 0 in counting mode, falls back below', () => {
    expect(getCorrectAction(sixteen, '10', FULL, 'counting', 0)).toMatchObject({
      action: 'stand',
      source: 'deviation',
    })
    // below the index, basic strategy resumes (surrender, since available)
    expect(getCorrectAction(sixteen, '10', FULL, 'counting', -1)).toMatchObject({
      action: 'surrender',
      source: 'basic',
    })
  })

  it('illegal deviation actions fall through to basic strategy', () => {
    // 10 vs 10 doubles at TC >= 4, but a 3-card 10 can't double -> basic hit
    const threeCardTen = deriveHandKey([c('2'), c('3'), c('5')], { canDouble: false, canSplit: false, canSurrender: false })
    expect(
      getCorrectAction(threeCardTen, '10', { canDouble: false, canSplit: false, canSurrender: false }, 'counting', 5)
    ).toMatchObject({ action: 'hit', source: 'basic' })
  })

  it('12 vs 4 hits only when the count has gone negative', () => {
    const twelve = deriveHandKey([c('10'), c('2')], FULL)
    expect(getCorrectAction(twelve, '4', FULL, 'counting', 0).action).toBe('hit')
    expect(getCorrectAction(twelve, '4', FULL, 'counting', 1).action).toBe('stand')
  })
})
