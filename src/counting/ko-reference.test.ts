import { describe, expect, it } from 'vitest'
import { buildShoe } from '../engine/cards'
import type { Rank } from '../engine/types'
import { COUNT_SYSTEMS, KO_PIVOT, countRanks, initialRunningCount, koKeyCount, tagValue } from './systems'
import {
  REF_KO_DECKS,
  REF_KO_IRC,
  REF_KO_KEY_COUNT,
  REF_KO_PIVOT,
  REF_KO_TAGS,
} from './__fixtures__/ko-reference'

/**
 * Locks KO's published numbers against an independently transcribed reference,
 * the way `basicStrategy.test.ts` locks the chart. `systems.test.ts` checks that
 * KO is internally consistent — that its tags, IRC and pivot fit together. That
 * is a different question from whether the numbers are the *right* ones, which
 * is what this file asks. A self-consistent set of wrong numbers would pass one
 * and fail the other.
 *
 * These steer bet size only, never a play decision, so an error here costs
 * expectation rather than teaching a wrong move. That is why it is checked
 * second, not why it is optional.
 */

const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const ko = COUNT_SYSTEMS.ko

describe('KO tags match the published reference', () => {
  for (const rank of ALL_RANKS) {
    it(`${rank} is ${REF_KO_TAGS[rank] > 0 ? '+' : ''}${REF_KO_TAGS[rank]}`, () => {
      expect(tagValue(ko, rank)).toBe(REF_KO_TAGS[rank])
    })
  }

  it('covers every rank — a missing tag would silently count as zero', () => {
    expect(Object.keys(REF_KO_TAGS).sort()).toEqual([...ALL_RANKS].sort())
  })
})

describe('KO anchor numbers match the published reference', () => {
  for (const decks of REF_KO_DECKS) {
    it(`${decks}-deck IRC is ${REF_KO_IRC[decks]}`, () => {
      expect(initialRunningCount(ko, decks)).toBe(REF_KO_IRC[decks])
    })

    it(`${decks}-deck key count is ${REF_KO_KEY_COUNT[decks]}`, () => {
      expect(koKeyCount(decks)).toBe(REF_KO_KEY_COUNT[decks])
    })
  }

  it('the pivot is +4 for every deck count', () => {
    expect(KO_PIVOT).toBe(REF_KO_PIVOT)
    for (const decks of REF_KO_DECKS) {
      // The pivot is fixed by construction: start at the IRC, deal the whole
      // shoe at +4 per deck, and you land on +4 no matter how big the shoe.
      expect(REF_KO_IRC[decks] + countRanks(ko, buildShoe(decks).map((c) => c.rank))).toBe(
        REF_KO_PIVOT
      )
    }
  })

  it('every key count sits below the pivot, and both move the right way with shoe size', () => {
    for (const decks of REF_KO_DECKS) {
      // Ramp up from the key count, max out at the pivot: the order has to hold
      // or the bet ramp inverts.
      expect(koKeyCount(decks)).toBeLessThan(KO_PIVOT)
    }
    const keys = REF_KO_DECKS.map((d) => koKeyCount(d))
    const descending = [...keys].sort((a, b) => b - a)
    expect(keys).toEqual(descending)
  })
})

describe('unlisted deck counts', () => {
  it('a four-deck game gets its own published key count, not the six-deck one', () => {
    // Regression: 4 was missing from the table, so it fell through to the
    // nearest-listed rule and resolved to the six-deck -4 instead of -1.
    expect(koKeyCount(4)).toBe(-1)
    expect(koKeyCount(4)).not.toBe(koKeyCount(6))
  })

  it('a shoe size nobody publishes borrows the nearest listed one', () => {
    expect(koKeyCount(3)).toBe(koKeyCount(4))
    expect(koKeyCount(5)).toBe(koKeyCount(6))
    expect(koKeyCount(7)).toBe(koKeyCount(8))
    expect(koKeyCount(12)).toBe(koKeyCount(8))
  })
})
