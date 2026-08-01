import { describe, expect, it } from 'vitest'
import type { Card, Rank } from './types'
import { makeHand } from './types'
import { DEFAULT_RULES } from './rules'
import { settleHand } from './payouts'

const c = (rank: Rank): Card => ({ rank, suit: '♣' })

describe('settleHand', () => {
  it('blackjack pays 3:2', () => {
    const s = settleHand(makeHand([c('A'), c('K')], 100), [c('10'), c('9')], DEFAULT_RULES)
    expect(s).toEqual({ result: 'blackjack', net: 150 })
  })

  it('blackjack vs dealer blackjack pushes', () => {
    const s = settleHand(makeHand([c('A'), c('K')], 100), [c('A'), c('Q')], DEFAULT_RULES)
    expect(s).toEqual({ result: 'push', net: 0 })
  })

  it('post-split 21 pays 1:1, not 3:2', () => {
    const s = settleHand(
      makeHand([c('A'), c('K')], 100, { isSplitHand: true }),
      [c('10'), c('9')],
      DEFAULT_RULES
    )
    expect(s).toEqual({ result: 'win', net: 100 })
  })

  it('surrender loses half the bet', () => {
    const s = settleHand(
      makeHand([c('10'), c('6')], 100, { surrendered: true }),
      [c('10'), c('9')],
      DEFAULT_RULES
    )
    expect(s).toEqual({ result: 'surrender', net: -50 })
  })

  it('player bust loses even if dealer busts too', () => {
    const s = settleHand(
      makeHand([c('10'), c('6'), c('9')], 100),
      [c('10'), c('6'), c('9')],
      DEFAULT_RULES
    )
    expect(s).toEqual({ result: 'bust', net: -100 })
  })

  it('dealer bust pays a live hand', () => {
    const s = settleHand(makeHand([c('10'), c('2')], 100, { stood: true }), [c('10'), c('6'), c('9')], DEFAULT_RULES)
    expect(s).toEqual({ result: 'win', net: 100 })
  })

  it('higher total wins, lower loses, equal pushes', () => {
    const dealer19 = [c('10'), c('9')]
    expect(settleHand(makeHand([c('10'), c('10')], 50), dealer19, DEFAULT_RULES).net).toBe(50)
    expect(settleHand(makeHand([c('10'), c('8')], 50, { stood: true }), dealer19, DEFAULT_RULES).net).toBe(-50)
    expect(settleHand(makeHand([c('10'), c('9')], 50), dealer19, DEFAULT_RULES).net).toBe(0)
  })

  it('doubled bet settles at its doubled amount', () => {
    const s = settleHand(
      makeHand([c('5'), c('6'), c('10')], 200, { doubled: true }),
      [c('10'), c('9')],
      DEFAULT_RULES
    )
    expect(s).toEqual({ result: 'win', net: 200 })
  })
})
