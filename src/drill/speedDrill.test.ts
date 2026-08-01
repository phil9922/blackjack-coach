import { describe, expect, it } from 'vitest'
import { buildSpeedDrill, scoreSpeedDrill, SPEEDS, DECK_SIZES } from './speedDrill'
import { countCards } from '../counting/hilo'

describe('buildSpeedDrill', () => {
  it('deals the requested number of real cards with the right answer', () => {
    for (const size of DECK_SIZES) {
      const run = buildSpeedDrill(size, 99)
      expect(run.cards).toHaveLength(size)
      expect(run.answer).toBe(countCards(run.cards))
    }
  })

  it('a full single deck always counts to zero (balanced system)', () => {
    expect(buildSpeedDrill(52, 4).answer).toBe(0)
  })

  it('is deterministic per seed but varies across seeds', () => {
    const a = buildSpeedDrill(26, 7)
    const b = buildSpeedDrill(26, 7)
    const c = buildSpeedDrill(26, 8)
    expect(a.cards).toEqual(b.cards)
    expect(a.cards).not.toEqual(c.cards)
  })
})

describe('scoreSpeedDrill', () => {
  it('pays more for faster tempo and longer runs', () => {
    const slow = scoreSpeedDrill(5, 5, 26, 1200)
    const fast = scoreSpeedDrill(5, 5, 26, 500)
    const long = scoreSpeedDrill(5, 5, 104, 1200)
    expect(slow.correct).toBe(true)
    expect(fast.xp).toBeGreaterThan(slow.xp)
    expect(long.xp).toBeGreaterThan(slow.xp)
  })

  it('reports how far off a miss was, and still pays something', () => {
    const s = scoreSpeedDrill(2, 5, 26, 800)
    expect(s).toMatchObject({ correct: false, off: -3 })
    expect(s.xp).toBeGreaterThan(0)
  })

  it('converts tempo to cards per minute', () => {
    expect(scoreSpeedDrill(0, 0, 26, 500).pace).toBe(120)
    expect(scoreSpeedDrill(0, 0, 26, 1200).pace).toBe(50)
  })

  it('the Fast tempo hits the Speed Counter threshold of 120 cards/min', () => {
    const fast = SPEEDS.find((s) => s.id === 'fast')!
    expect(scoreSpeedDrill(0, 0, 52, fast.ms).pace).toBeGreaterThanOrEqual(120)
  })
})
