import type { TrainingMode } from '../engine/types'
import type { CountSystem } from '../counting/systems'
import { COUNT_SYSTEMS, KO_PIVOT, koKeyCount } from '../counting/systems'

export interface BetAdvice {
  amount: number
  reason: string
}

interface AdvisorInput {
  mode: TrainingMode
  /** true count for balanced systems; ignored for unbalanced ones */
  trueCount: number
  bankroll: number
  tableMin: number
  tableMax: number
  /** defaults to Hi-Lo, which is what the ramp below was written for */
  system?: CountSystem
  /** required by unbalanced systems, which ramp off the running count */
  runningCount?: number
  decks?: number
}

/** Hi-Lo bet ramp in units of the table minimum. */
export function rampUnits(trueCount: number): number {
  if (trueCount <= 1) return 1
  if (trueCount === 2) return 2
  if (trueCount === 3) return 4
  if (trueCount === 4) return 6
  return 8
}

/**
 * KO ramp, anchored to its two published points rather than converted into a
 * Hi-Lo true count: flat below the key count, maximum at the pivot (+4), and
 * climbing in between. Reusing the Hi-Lo ramp here would max the bet out
 * several running-count points too early.
 */
export function koRampUnits(runningCount: number, decks: number): number {
  const key = koKeyCount(decks)
  const span = KO_PIVOT - key
  const above = runningCount - key
  if (above <= 0) return 1
  if (above >= span) return 8
  return Math.min(8, Math.max(1, 1 + Math.round((7 * above) / span)))
}

export function suggestBet({
  mode,
  trueCount,
  bankroll,
  tableMin,
  tableMax,
  system = COUNT_SYSTEMS.hilo,
  runningCount = 0,
  decks = 6,
}: AdvisorInput): BetAdvice {
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

  if (!system.balanced) {
    const key = koKeyCount(decks)
    const units = koRampUnits(runningCount, decks)
    const amount = clamp(tableMin * units)
    const rc = `${runningCount >= 0 ? '+' : ''}${runningCount}`
    if (units === 1) {
      return {
        amount,
        reason:
          `Running count ${rc}: still at or below the key count (${key}) for this shoe, so the house has the edge — bet the table minimum ($${amount}). ` +
          `${system.name} plays straight off the running count; there is no true-count division to do.`,
      }
    }
    return {
      amount,
      reason:
        `Running count ${rc}: above the key count (${key}) and climbing toward the pivot (+${KO_PIVOT}), where your edge is biggest. ` +
        `Press it to ${units} units ($${amount}) — in ${system.name} the running count is the signal, so you ramp on it directly.`,
    }
  }

  const units = rampUnits(trueCount)
  const amount = clamp(tableMin * units)
  const aceNote = system.aceNeutral
    ? ` ${system.name} leaves aces at 0, so this understates a shoe that is still ace-rich — side-count aces if you want the betting edge back.`
    : ''
  if (units === 1) {
    return {
      amount,
      reason:
        `True count ${trueCount >= 0 ? '+' : ''}${trueCount}: the house still has the edge (or it's a coin flip), so bet the table minimum ($${amount}) and wait. ` +
        `Counting profit comes from betting small when the shoe is against you and big when it turns.${aceNote}`,
    }
  }
  const edge = ((trueCount - 1) * 0.5).toFixed(1)
  return {
    amount,
    reason:
      `True count +${trueCount}: the shoe is rich in tens and aces, giving you roughly a ${edge}% edge (each true point ≈ +0.5% over the ~0.5% house edge). ` +
      `Press it with ${units} units ($${amount}) — this is exactly when counters get their money in.${aceNote}`,
  }
}
