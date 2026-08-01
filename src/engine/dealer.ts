import type { Card } from './types'
import type { TableRules } from './rules'
import { evaluateHand } from './hand'

export function dealerShouldHit(cards: Card[], rules: TableRules): boolean {
  const { total, soft } = evaluateHand(cards)
  if (total < 17) return true
  if (total === 17 && soft && rules.hitSoft17) return true
  return false
}
