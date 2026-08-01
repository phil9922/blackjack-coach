import type { TrainingMode } from '../engine/types'

export interface BetAdvice {
  amount: number
  reason: string
}

interface AdvisorInput {
  mode: TrainingMode
  trueCount: number
  bankroll: number
  tableMin: number
  tableMax: number
}

/** Hi-Lo bet ramp in units of the table minimum. */
export function rampUnits(trueCount: number): number {
  if (trueCount <= 1) return 1
  if (trueCount === 2) return 2
  if (trueCount === 3) return 4
  if (trueCount === 4) return 6
  return 8
}

export function suggestBet({ mode, trueCount, bankroll, tableMin, tableMax }: AdvisorInput): BetAdvice {
  const clamp = (n: number) => Math.max(tableMin, Math.min(tableMax, Math.min(n, bankroll)))

  if (mode === 'basic') {
    // Flat betting: ~1.5% of bankroll, at least the table minimum.
    const flat = clamp(Math.max(tableMin, Math.round((bankroll * 0.015) / 5) * 5))
    return {
      amount: flat,
      reason:
        `Without counting, no round is a better bet than another — the odds are set before the deal, so bet sizing can't buy you an edge. ` +
        `Keep a flat bet around 1-2% of your bankroll ($${flat}) so a normal losing streak can't wipe you out.`,
    }
  }

  const units = rampUnits(trueCount)
  const amount = clamp(tableMin * units)
  if (units === 1) {
    return {
      amount,
      reason:
        `True count ${trueCount >= 0 ? '+' : ''}${trueCount}: the house still has the edge (or it's a coin flip), so bet the table minimum ($${amount}) and wait. ` +
        `Counting profit comes from betting small when the shoe is against you and big when it turns.`,
    }
  }
  const edge = ((trueCount - 1) * 0.5).toFixed(1)
  return {
    amount,
    reason:
      `True count +${trueCount}: the shoe is rich in tens and aces, giving you roughly a ${edge}% edge (each true point ≈ +0.5% over the ~0.5% house edge). ` +
      `Press it with ${units} units ($${amount}) — this is exactly when counters get their money in.`,
  }
}
