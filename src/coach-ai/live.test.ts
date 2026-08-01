import { describe, expect, it } from 'vitest'
import { parseAssessment, shouldRunLive, MIN_DECISIONS, type AiCoachState } from './live'

const state = (over: Partial<AiCoachState> = {}): AiCoachState => ({
  updatedAt: 1000,
  handsAtLastRun: 40,
  decisionsAtLastRun: 100,
  doingWell: [],
  needsWork: [],
  tips: [],
  alert: '',
  ...over,
})

describe('shouldRunLive', () => {
  const base = {
    frequency: 'normal' as const,
    hasKey: true,
    handsPlayed: 60,
    gradedDecisions: 140,
    busy: false,
    previous: state(),
  }

  it('runs once the hand interval and new evidence are both met', () => {
    expect(shouldRunLive(base)).toBe(true)
  })

  it('never runs without a key, when off, or while a run is in flight', () => {
    expect(shouldRunLive({ ...base, hasKey: false })).toBe(false)
    expect(shouldRunLive({ ...base, frequency: 'off' })).toBe(false)
    expect(shouldRunLive({ ...base, busy: true })).toBe(false)
  })

  it('waits for enough graded decisions before the first run', () => {
    expect(
      shouldRunLive({ ...base, previous: null, gradedDecisions: MIN_DECISIONS - 1 })
    ).toBe(false)
    expect(shouldRunLive({ ...base, previous: null, gradedDecisions: MIN_DECISIONS })).toBe(true)
  })

  it('does not re-run before the interval has passed', () => {
    expect(shouldRunLive({ ...base, handsPlayed: 54 })).toBe(false) // only 14 new hands
    expect(shouldRunLive({ ...base, handsPlayed: 55 })).toBe(true)
  })

  it('"often" reviews on a shorter interval', () => {
    expect(shouldRunLive({ ...base, frequency: 'often', handsPlayed: 48 })).toBe(true)
    expect(shouldRunLive({ ...base, frequency: 'often', handsPlayed: 47 })).toBe(false)
  })

  it('skips a paid call when hands passed but nothing new was graded', () => {
    // e.g. hands played out with no user decisions (dealt blackjacks, dealer BJ)
    expect(shouldRunLive({ ...base, gradedDecisions: 100 })).toBe(false)
  })
})

describe('parseAssessment', () => {
  it('reads a well-formed assessment', () => {
    const parsed = parseAssessment(
      JSON.stringify({
        doingWell: [{ title: 'Hard totals', detail: '94% over 60 decisions.' }],
        needsWork: [{ title: 'Soft 18', detail: 'You stand vs 9 and 10.' }],
        tips: [{ title: 'Hit soft 18 vs 9+', detail: 'The ace makes it free.' }],
        alert: 'You keep standing on soft 18 against a 10.',
      })
    )
    expect(parsed?.needsWork[0].title).toBe('Soft 18')
    expect(parsed?.alert).toMatch(/soft 18/)
  })

  it('caps each list so the dashboard cannot be flooded', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `t${i}`, detail: 'd' }))
    const parsed = parseAssessment(JSON.stringify({ doingWell: many, needsWork: many, tips: many, alert: '' }))
    expect(parsed?.doingWell).toHaveLength(4)
    expect(parsed?.tips).toHaveLength(4)
  })

  it('drops malformed items instead of rendering junk', () => {
    const parsed = parseAssessment(
      JSON.stringify({
        doingWell: [{ title: 'ok', detail: 'fine' }, { title: 5 }, null, 'nope'],
        needsWork: 'not an array',
        alert: 42,
      })
    )
    expect(parsed?.doingWell).toHaveLength(1)
    expect(parsed?.needsWork).toEqual([])
    expect(parsed?.tips).toEqual([])
    expect(parsed?.alert).toBe('')
  })

  it('returns null on non-JSON rather than throwing', () => {
    expect(parseAssessment('I could not analyze that.')).toBe(null)
    expect(parseAssessment('')).toBe(null)
  })
})
