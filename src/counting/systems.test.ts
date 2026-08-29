import { describe, expect, it } from 'vitest'
import { buildShoe } from '../engine/cards'
import type { Rank } from '../engine/types'
import {
  COUNT_SYSTEMS,
  COUNT_SYSTEM_LIST,
  KO_PIVOT,
  bettingCount,
  countRanks,
  getCountSystem,
  initialRunningCount,
  koKeyCount,
  tagValue,
} from './systems'
import { hiLoValue } from './hilo'
import { koRampUnits, rampUnits } from '../betting/advisor'
import {
  initGame,
  gameReducer,
  activeSeat,
  currentTrueCount,
  gradingMode,
  deviationsSuppressed,
} from '../engine/game'
import { DEFAULT_SETTINGS } from '../engine/game'
import { DEFAULT_RULES } from '../engine/rules'

const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

describe('count system tag values', () => {
  it('Hi-Lo matches the standalone hiLoValue used everywhere else', () => {
    for (const r of ALL_RANKS) {
      expect(tagValue(COUNT_SYSTEMS.hilo, r)).toBe(hiLoValue(r))
    }
  })

  it('KO is Hi-Lo plus the seven', () => {
    const ko = COUNT_SYSTEMS.ko
    expect(tagValue(ko, '7')).toBe(1)
    for (const r of ALL_RANKS) {
      const expected = r === '7' ? 1 : hiLoValue(r)
      expect(tagValue(ko, r)).toBe(expected)
    }
  })

  it('Hi-Opt I counts 3-6 and tens only, leaving aces neutral', () => {
    const h = COUNT_SYSTEMS.hiopt1
    expect([h.values['3'], h.values['4'], h.values['5'], h.values['6']]).toEqual([1, 1, 1, 1])
    expect([h.values['2'], h.values['7'], h.values['8'], h.values['9'], h.values.A]).toEqual([
      0, 0, 0, 0, 0,
    ])
    for (const r of ['10', 'J', 'Q', 'K'] as Rank[]) expect(h.values[r]).toBe(-1)
    expect(h.aceNeutral).toBe(true)
  })

  it('J/Q/K always carry the same tag as a 10', () => {
    for (const sys of COUNT_SYSTEM_LIST) {
      for (const r of ['J', 'Q', 'K'] as Rank[]) {
        expect(tagValue(sys, r)).toBe(tagValue(sys, '10'))
      }
    }
  })
})

describe('balance', () => {
  const deckRanks = (decks: number) => buildShoe(decks).map((c) => c.rank)

  it('balanced systems sum to zero over a whole shoe', () => {
    for (const sys of COUNT_SYSTEM_LIST.filter((s) => s.balanced)) {
      expect(countRanks(sys, deckRanks(6))).toBe(0)
    }
  })

  it('KO runs +4 per deck, and its IRC lands the dealt-out shoe on the pivot', () => {
    const ko = COUNT_SYSTEMS.ko
    for (const decks of [1, 2, 6, 8]) {
      expect(countRanks(ko, deckRanks(decks))).toBe(4 * decks)
      // The defining KO identity: IRC = 4(1-N) and the shoe runs +4N, so a
      // fully dealt shoe always ends on +4 — the pivot, for every deck count.
      // This is what ties the tags, the IRC and the fixed pivot together, so
      // it breaks loudly if any one of the three is edited in isolation.
      expect(initialRunningCount(ko, decks) + countRanks(ko, deckRanks(decks))).toBe(KO_PIVOT)
    }
  })

  it('balanced systems start a shoe at zero', () => {
    for (const sys of COUNT_SYSTEM_LIST.filter((s) => s.balanced)) {
      expect(initialRunningCount(sys, 6)).toBe(0)
    }
  })

  it('KO six-deck IRC is -20', () => {
    expect(initialRunningCount(COUNT_SYSTEMS.ko, 6)).toBe(-20)
  })
})

describe('only Hi-Lo claims verified deviation indices', () => {
  it('exactly one system supports deviations', () => {
    const supporting = COUNT_SYSTEM_LIST.filter((s) => s.supportsDeviations)
    expect(supporting.map((s) => s.id)).toEqual(['hilo'])
  })

  it('getCountSystem falls back to Hi-Lo for missing or unknown ids', () => {
    expect(getCountSystem(undefined).id).toBe('hilo')
    expect(getCountSystem('nope' as never).id).toBe('hilo')
  })
})

describe('betting scale', () => {
  it('balanced systems ramp off the true count', () => {
    expect(bettingCount(COUNT_SYSTEMS.hilo, 12, 3, 6)).toBe(3)
    expect(bettingCount(COUNT_SYSTEMS.hiopt1, 12, -2, 6)).toBe(-2)
  })

  it('KO measures distance above its key count, not a true count', () => {
    // Six decks: key count -4, pivot +4.
    expect(koKeyCount(6)).toBe(-4)
    expect(bettingCount(COUNT_SYSTEMS.ko, -4, 0, 6)).toBe(0)
    expect(bettingCount(COUNT_SYSTEMS.ko, KO_PIVOT, 0, 6)).toBe(8)
  })

  it('an unlisted deck count borrows the nearest published key count', () => {
    expect(koKeyCount(7)).toBe(koKeyCount(8))
    expect(koKeyCount(5)).toBe(koKeyCount(6))
  })

  it('the KO ramp is flat below the key count and maxed at the pivot', () => {
    expect(koRampUnits(-10, 6)).toBe(1)
    expect(koRampUnits(-4, 6)).toBe(1)
    expect(koRampUnits(KO_PIVOT, 6)).toBe(8)
    expect(koRampUnits(20, 6)).toBe(8)
  })

  it('the KO ramp climbs monotonically between its two anchors', () => {
    let last = 0
    for (let rc = -6; rc <= 6; rc++) {
      const units = koRampUnits(rc, 6)
      expect(units).toBeGreaterThanOrEqual(last)
      last = units
    }
  })

  it('does not max the KO bet out as early as the Hi-Lo ramp would', () => {
    // Reusing the Hi-Lo ramp on KO's scale would bet 8 units at RC +1.
    expect(rampUnits(bettingCount(COUNT_SYSTEMS.ko, 1, 0, 6))).toBe(8)
    expect(koRampUnits(1, 6)).toBeLessThan(8)
  })
})

describe('engine wiring', () => {
  const game = (countSystem: 'hilo' | 'ko' | 'hiopt1', mode: 'basic' | 'counting' = 'counting') =>
    initGame({
      rules: DEFAULT_RULES,
      settings: { ...DEFAULT_SETTINGS, mode, countSystem },
      seed: 7,
    })

  it('a fresh KO shoe starts at the IRC, not zero', () => {
    expect(game('ko').runningCount).toBe(-20)
    expect(game('hilo').runningCount).toBe(0)
    expect(game('hiopt1').runningCount).toBe(0)
  })

  it('unbalanced systems report no true count rather than a bogus one', () => {
    const ko = game('ko')
    // A raw division here would report a large negative "true count".
    expect(currentTrueCount(ko)).toBe(0)
  })

  it('grades plays as basic strategy unless the system has verified indices', () => {
    expect(gradingMode(game('hilo'))).toBe('counting')
    expect(gradingMode(game('ko'))).toBe('basic')
    expect(gradingMode(game('hiopt1'))).toBe('basic')
    // Basic mode never grades deviations regardless of system.
    expect(gradingMode(game('hilo', 'basic'))).toBe('basic')
  })

  it('flags when counting is on but deviations are suppressed', () => {
    expect(deviationsSuppressed(game('hilo'))).toBe(false)
    expect(deviationsSuppressed(game('ko'))).toBe(true)
    expect(deviationsSuppressed(game('ko', 'basic'))).toBe(false)
  })

  it('defaults to Hi-Lo so existing profiles are unaffected', () => {
    expect(DEFAULT_SETTINGS.countSystem).toBe('hilo')
  })
})

describe('the shoe stays honest under every system', () => {
  /**
   * The count must always equal the IRC plus the tags of exactly the cards
   * that have been turned face up — no more, no less. This is the property
   * that makes counting practice worth anything, so it gets checked against
   * the real reducer rather than against the count helpers in isolation.
   */
  const faceUpTotal = (state: ReturnType<typeof initGame>) => {
    const sys = getCountSystem(state.settings.countSystem)
    const seen = state.shoe.slice(0, state.nextCard).map((c) => c.rank)
    // The hole card is dealt but not counted until it is revealed.
    const hole = state.dealerCards[1]
    const holeAdjust =
      hole && !state.holeRevealed ? -tagValue(sys, hole.rank) : 0
    return initialRunningCount(sys, state.rules.decks) + countRanks(sys, seen) + holeAdjust
  }

  for (const id of ['hilo', 'ko', 'hiopt1'] as const) {
    it(`${COUNT_SYSTEMS[id].name}: running count tracks the cards actually shown`, () => {
      let state = initGame({
        rules: DEFAULT_RULES,
        settings: { ...DEFAULT_SETTINGS, mode: 'counting', countSystem: id },
        seed: 1234,
      })

      for (let round = 0; round < 12; round++) {
        state = gameReducer(state, { type: 'PLACE_BET_AND_DEAL', amount: 25 })
        expect(state.runningCount).toBe(faceUpTotal(state))

        // Play the round out, standing on everything, then settle.
        for (let i = 0; i < 60 && state.phase !== 'roundOver'; i++) {
          if (state.phase === 'insurance') {
            state = gameReducer(state, { type: 'INSURANCE', take: false })
          } else if (state.phase === 'seatTurn' && activeSeat(state)?.kind === 'user') {
            state = gameReducer(state, { type: 'PLAYER_ACTION', action: 'stand' })
          } else if (state.awaitingAck) {
            state = gameReducer(state, { type: 'ACKNOWLEDGE' })
          } else {
            state = gameReducer(state, { type: 'ADVANCE' })
          }
        }
        expect(state.runningCount).toBe(faceUpTotal(state))

        state = gameReducer(state, { type: 'NEXT_ROUND' })
        if (state.phase === 'countQuiz') {
          state = gameReducer(state, { type: 'QUIZ_SUBMIT', running: 0, trueCountAnswer: 0 })
        }
        // A reshuffle resets to the IRC; anything else keeps accumulating.
        if (state.justShuffled) {
          expect(state.runningCount).toBe(
            initialRunningCount(getCountSystem(id), state.rules.decks)
          )
        }
      }
    })
  }
})

describe('switching system mid-shoe', () => {
  const withSystem = (id: 'hilo' | 'ko' | 'hiopt1') =>
    initGame({
      rules: DEFAULT_RULES,
      settings: { ...DEFAULT_SETTINGS, mode: 'counting', countSystem: id },
      seed: 42,
    })

  it('takes a fresh shoe so the count is never a mix of two tag sets', () => {
    // Play a few hands so the Hi-Lo count is somewhere other than zero.
    let s = withSystem('hilo')
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25 })
    for (let i = 0; i < 40 && s.phase !== 'roundOver'; i++) {
      if (s.phase === 'insurance') s = gameReducer(s, { type: 'INSURANCE', take: false })
      else if (s.phase === 'seatTurn' && activeSeat(s)?.kind === 'user') {
        s = gameReducer(s, { type: 'PLAYER_ACTION', action: 'stand' })
      } else if (s.awaitingAck) s = gameReducer(s, { type: 'ACKNOWLEDGE' })
      else s = gameReducer(s, { type: 'ADVANCE' })
    }
    s = gameReducer(s, { type: 'NEXT_ROUND' })
    if (s.phase === 'countQuiz') {
      s = gameReducer(s, { type: 'QUIZ_SUBMIT', running: 0, trueCountAnswer: 0 })
    }
    expect(s.nextCard).toBeGreaterThan(0)

    const switched = gameReducer(s, {
      type: 'UPDATE_SETTINGS',
      settings: { ...s.settings, countSystem: 'ko' },
    })

    expect(switched.settings.countSystem).toBe('ko')
    // Fresh shoe, and the count reads KO's IRC immediately — not at the next
    // deal, and not carrying the old Hi-Lo running count forward.
    expect(switched.nextCard).toBe(0)
    expect(switched.runningCount).toBe(initialRunningCount(COUNT_SYSTEMS.ko, DEFAULT_RULES.decks))
  })

  it('leaves the shoe alone when other settings change', () => {
    let s = withSystem('hilo')
    s = gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount: 25 })
    for (let i = 0; i < 40 && s.phase !== 'roundOver'; i++) {
      if (s.phase === 'insurance') s = gameReducer(s, { type: 'INSURANCE', take: false })
      else if (s.phase === 'seatTurn' && activeSeat(s)?.kind === 'user') {
        s = gameReducer(s, { type: 'PLAYER_ACTION', action: 'stand' })
      } else if (s.awaitingAck) s = gameReducer(s, { type: 'ACKNOWLEDGE' })
      else s = gameReducer(s, { type: 'ADVANCE' })
    }
    s = gameReducer(s, { type: 'NEXT_ROUND' })
    if (s.phase === 'countQuiz') {
      s = gameReducer(s, { type: 'QUIZ_SUBMIT', running: 0, trueCountAnswer: 0 })
    }
    const dealt = s.nextCard
    const kept = gameReducer(s, {
      type: 'UPDATE_SETTINGS',
      settings: { ...s.settings, showCount: !s.settings.showCount },
    })
    expect(kept.nextCard).toBe(dealt)
  })
})
