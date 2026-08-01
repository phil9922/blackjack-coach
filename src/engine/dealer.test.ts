import { describe, expect, it } from 'vitest'
import type { Card, Rank } from './types'
import { DEFAULT_RULES } from './rules'
import { dealerShouldHit } from './dealer'

const c = (rank: Rank): Card => ({ rank, suit: '♦' })
const S17 = { ...DEFAULT_RULES, hitSoft17: false }

describe('dealerShouldHit (H17)', () => {
  it('hits below 17', () => {
    expect(dealerShouldHit([c('10'), c('6')], DEFAULT_RULES)).toBe(true)
  })

  it('hits soft 17 under H17', () => {
    expect(dealerShouldHit([c('A'), c('6')], DEFAULT_RULES)).toBe(true)
  })

  it('stands on soft 17 under S17', () => {
    expect(dealerShouldHit([c('A'), c('6')], S17)).toBe(false)
  })

  it('stands on hard 17', () => {
    expect(dealerShouldHit([c('10'), c('7')], DEFAULT_RULES)).toBe(false)
  })

  it('stands on soft 18', () => {
    expect(dealerShouldHit([c('A'), c('7')], DEFAULT_RULES)).toBe(false)
  })

  it('multi-card soft 17 still hits (A+2+4)', () => {
    expect(dealerShouldHit([c('A'), c('2'), c('4')], DEFAULT_RULES)).toBe(true)
  })
})
