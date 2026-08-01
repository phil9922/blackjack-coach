import { describe, expect, it } from 'vitest'
import { buildShoe, shuffle, cardValue, normalizeRank } from './cards'

describe('buildShoe', () => {
  it('a 6-deck shoe has 312 cards, 24 of each rank', () => {
    const shoe = buildShoe(6)
    expect(shoe).toHaveLength(312)
    expect(shoe.filter((c) => c.rank === 'A')).toHaveLength(24)
    expect(shoe.filter((c) => c.rank === 'K')).toHaveLength(24)
  })
})

describe('shuffle', () => {
  it('is deterministic for a given seed and permutes the shoe', () => {
    const shoe = buildShoe(6)
    const a = shuffle(shoe, 12345)
    const b = shuffle(shoe, 12345)
    const c = shuffle(shoe, 54321)
    expect(a.cards).toEqual(b.cards)
    expect(a.cards).not.toEqual(c.cards)
    expect(a.cards).toHaveLength(312)
    // same multiset of cards
    const key = (cards: typeof shoe) =>
      cards.map((x) => x.rank + x.suit).sort().join(',')
    expect(key(a.cards)).toBe(key(shoe))
  })
})

describe('card values', () => {
  it('faces are 10, ace is 1 (pre-promotion)', () => {
    expect(cardValue('K')).toBe(10)
    expect(cardValue('A')).toBe(1)
    expect(cardValue('7')).toBe(7)
  })

  it('faces normalize to 10 for strategy', () => {
    expect(normalizeRank('Q')).toBe('10')
    expect(normalizeRank('A')).toBe('A')
  })
})
