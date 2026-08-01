import { describe, expect, it } from 'vitest'
import type { Card, Rank } from '../engine/types'
import { HARD, SOFT, PAIRS, DEALER_ORDER } from './basicStrategy'
import { deriveHandKey, getCorrectAction, resolveCode, chartCode } from './lookup'
import type { Availability } from './types'
import { REF_HARD, REF_SOFT, REF_PAIRS } from './__fixtures__/h17-reference-chart'

/**
 * Flagship correctness test: the app's chart was encoded by hand, the fixture
 * was independently transcribed from the published Wizard of Odds H17 chart
 * image by a separate process. Two transcriptions catch each other's typos.
 */
describe('chart matches independent H17/6D/DAS/LS reference transcription', () => {
  it('hard totals 5-21, all 10 dealer upcards', () => {
    for (let total = 5; total <= 21; total++) {
      for (let col = 0; col < 10; col++) {
        expect(
          HARD[total][col],
          `hard ${total} vs ${DEALER_ORDER[col]}`
        ).toBe(REF_HARD[total][col])
      }
    }
  })

  it('soft totals 13-21, all 10 dealer upcards', () => {
    for (let total = 13; total <= 21; total++) {
      for (let col = 0; col < 10; col++) {
        expect(
          SOFT[total][col],
          `soft ${total} vs ${DEALER_ORDER[col]}`
        ).toBe(REF_SOFT[total][col])
      }
    }
  })

  it('all pairs, all 10 dealer upcards', () => {
    for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']) {
      for (let col = 0; col < 10; col++) {
        expect(
          PAIRS[rank][col],
          `pair ${rank},${rank} vs ${DEALER_ORDER[col]}`
        ).toBe(REF_PAIRS[rank][col])
      }
    }
  })
})

const c = (rank: Rank): Card => ({ rank, suit: '♥' })
const FULL: Availability = { canDouble: true, canSplit: true, canSurrender: true }
const HIT_ONLY: Availability = { canDouble: false, canSplit: false, canSurrender: false }

describe('availability-aware resolution', () => {
  it('16 vs 10: surrender when allowed, hit otherwise', () => {
    const key = deriveHandKey([c('10'), c('6')], FULL)
    expect(getCorrectAction(key, '10', FULL, 'basic', 0).action).toBe('surrender')
    expect(getCorrectAction(key, '10', HIT_ONLY, 'basic', 0).action).toBe('hit')
  })

  it('3-card 11 vs 6: double unavailable resolves to hit', () => {
    const key = deriveHandKey([c('2'), c('4'), c('5')], HIT_ONLY)
    expect(key).toEqual({ kind: 'hard', total: 11 })
    expect(getCorrectAction(key, '6', HIT_ONLY, 'basic', 0).action).toBe('hit')
  })

  it('3-card soft 18 vs 3: double unavailable resolves to stand (Ds)', () => {
    const key = deriveHandKey([c('A'), c('3'), c('4')], HIT_ONLY)
    expect(key).toEqual({ kind: 'soft', total: 18 })
    expect(getCorrectAction(key, '3', HIT_ONLY, 'basic', 0).action).toBe('stand')
  })

  it('9,9 with splits exhausted falls through to hard 18 = stand', () => {
    const key = deriveHandKey([c('9'), c('9')], HIT_ONLY)
    expect(key).toEqual({ kind: 'hard', total: 18 })
    expect(getCorrectAction(key, '8', HIT_ONLY, 'basic', 0).action).toBe('stand')
  })

  it('8,8 vs A: surrender when allowed (H17), else split, else hit as hard 16', () => {
    const key = deriveHandKey([c('8'), c('8')], FULL)
    expect(getCorrectAction(key, 'A', FULL, 'basic', 0).action).toBe('surrender')
    const noSurrender = { ...FULL, canSurrender: false }
    expect(getCorrectAction(key, 'A', noSurrender, 'basic', 0).action).toBe('split')
    const bare = deriveHandKey([c('8'), c('8')], HIT_ONLY)
    expect(bare).toEqual({ kind: 'hard', total: 16 })
    expect(getCorrectAction(bare, 'A', HIT_ONLY, 'basic', 0).action).toBe('hit')
  })

  it('A,A with splits exhausted is soft 12 = hit', () => {
    const key = deriveHandKey([c('A'), c('A')], HIT_ONLY)
    expect(key).toEqual({ kind: 'soft', total: 12 })
    expect(getCorrectAction(key, '6', HIT_ONLY, 'basic', 0).action).toBe('hit')
  })

  it('K,Q counts as a ten pair (never split: stand)', () => {
    const key = deriveHandKey([c('K'), c('Q')], FULL)
    expect(key).toEqual({ kind: 'pair', rank: '10' })
    expect(getCorrectAction(key, '6', FULL, 'basic', 0).action).toBe('stand')
  })

  it('face-card upcards normalize to the 10 column', () => {
    expect(chartCode({ kind: 'hard', total: 16 }, 'J')).toBe(
      chartCode({ kind: 'hard', total: 16 }, '10')
    )
  })

  it('every composite code resolves to a legal action', () => {
    const combos: Availability[] = []
    for (const canDouble of [true, false])
      for (const canSplit of [true, false])
        for (const canSurrender of [true, false])
          combos.push({ canDouble, canSplit, canSurrender })
    for (const av of combos) {
      for (const code of ['H', 'S', 'Dh', 'Ds', 'Rh', 'Rs'] as const) {
        const action = resolveCode(code, av)
        if (!av.canDouble) expect(action).not.toBe('double')
        if (!av.canSurrender) expect(action).not.toBe('surrender')
      }
    }
  })
})
