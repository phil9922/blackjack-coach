import { describe, expect, it } from 'vitest'
import type { Card, Rank } from './types'
import { makeHand } from './types'
import { evaluateHand, isBlackjack, isBusted, isHandResolved, isPairHand, pairRank } from './hand'

const c = (rank: Rank): Card => ({ rank, suit: '♠' })

describe('evaluateHand', () => {
  it('counts number cards at face value', () => {
    expect(evaluateHand([c('10'), c('6')])).toEqual({ total: 16, soft: false })
  })

  it('promotes one ace to 11 when it fits', () => {
    expect(evaluateHand([c('A'), c('5')])).toEqual({ total: 16, soft: true })
    expect(evaluateHand([c('A'), c('K')])).toEqual({ total: 21, soft: true })
  })

  it('A+A is soft 12', () => {
    expect(evaluateHand([c('A'), c('A')])).toEqual({ total: 12, soft: true })
  })

  it('A+A+9 is soft 21', () => {
    expect(evaluateHand([c('A'), c('A'), c('9')])).toEqual({ total: 21, soft: true })
  })

  it('soft hand goes hard when promotion would bust', () => {
    expect(evaluateHand([c('A'), c('5'), c('10')])).toEqual({ total: 16, soft: false })
  })

  it('five aces is soft 15', () => {
    expect(evaluateHand([c('A'), c('A'), c('A'), c('A'), c('A')])).toEqual({
      total: 15,
      soft: true,
    })
  })

  it('detects busts', () => {
    expect(isBusted([c('10'), c('6'), c('9')])).toBe(true)
    expect(isBusted([c('A'), c('10'), c('10')])).toBe(false) // hard 21
  })
})

describe('isBlackjack', () => {
  it('two-card 21 off the deal is blackjack', () => {
    expect(isBlackjack([c('A'), c('K')], false)).toBe(true)
  })

  it('21 after a split is not blackjack', () => {
    expect(isBlackjack([c('A'), c('K')], true)).toBe(false)
  })

  it('three-card 21 is not blackjack', () => {
    expect(isBlackjack([c('7'), c('7'), c('7')], false)).toBe(false)
  })
})

describe('pairs', () => {
  it('face cards pair with tens', () => {
    expect(isPairHand([c('K'), c('Q')])).toBe(true)
    expect(pairRank([c('K'), c('10')])).toBe('10')
  })

  it('aces pair', () => {
    expect(pairRank([c('A'), c('A')])).toBe('A')
  })

  it('unequal values are not a pair', () => {
    expect(isPairHand([c('5'), c('6')])).toBe(false)
    expect(pairRank([c('9'), c('10')])).toBe(null)
  })
})

describe('isHandResolved', () => {
  it('resolves stood, surrendered, doubled-and-dealt, and 21+ hands', () => {
    expect(isHandResolved(makeHand([c('10'), c('6')], 10, { stood: true }))).toBe(true)
    expect(isHandResolved(makeHand([c('10'), c('6')], 10, { surrendered: true }))).toBe(true)
    expect(
      isHandResolved(makeHand([c('5'), c('6'), c('9')], 10, { doubled: true }))
    ).toBe(true)
    expect(isHandResolved(makeHand([c('A'), c('K')], 10))).toBe(true) // 21
    expect(isHandResolved(makeHand([c('10'), c('6'), c('9')], 10))).toBe(true) // bust
  })

  it('split aces resolve after their one card', () => {
    expect(
      isHandResolved(makeHand([c('A'), c('5')], 10, { isSplitHand: true, fromSplitAces: true }))
    ).toBe(true)
  })

  it('a live two-card hand is unresolved', () => {
    expect(isHandResolved(makeHand([c('10'), c('6')], 10))).toBe(false)
  })
})
