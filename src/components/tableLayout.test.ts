import { describe, expect, it } from 'vitest'
import { payoutLegend, dealerLegend } from './TableLayout'
import { DEFAULT_RULES } from '../engine/rules'

/**
 * The felt prints the house's terms. A table that advertises 3:2 while the
 * dealer pays 6:5 is precisely the trap this app exists to inoculate against,
 * so the print is generated from the live rules and pinned by these tests.
 */
describe('printed felt legends', () => {
  it('prints the payout as a real felt writes it', () => {
    expect(payoutLegend(1.5)).toBe('3 TO 2')
    expect(payoutLegend(1.2)).toBe('6 TO 5')
    expect(payoutLegend(2)).toBe('2 TO 1')
    expect(payoutLegend(1)).toBe('EVEN MONEY')
  })

  it('never prints a decimal for an unusual payout', () => {
    expect(payoutLegend(1.25)).toBe('5 TO 4')
    expect(payoutLegend(1.4)).toBe('7 TO 5')
    for (const p of [1.5, 1.2, 1.25, 1.4, 2, 1]) {
      expect(payoutLegend(p)).not.toMatch(/\./)
    }
  })

  it('follows the house rules rather than a fixed string', () => {
    // The default table is H17 — the single most common thing published charts
    // get wrong, so the felt must say so out loud.
    expect(DEFAULT_RULES.hitSoft17).toBe(true)
    expect(dealerLegend(true)).toBe('Dealer must draw to 16 and hit soft 17')
    expect(dealerLegend(false)).toBe('Dealer must draw to 16 and stand on all 17s')
  })

  it('the default table prints what the engine actually deals', () => {
    expect(payoutLegend(DEFAULT_RULES.blackjackPayout)).toBe('3 TO 2')
    expect(dealerLegend(DEFAULT_RULES.hitSoft17)).toContain('hit soft 17')
  })
})
