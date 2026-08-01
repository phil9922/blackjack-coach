import type { Card, Rank } from '../engine/types'
import { evaluateHand, isPairHand, pairRank } from '../engine/hand'
import { rngNext, rngInt } from '../engine/rng'
import type { Action, Availability } from '../strategy/types'
import { deriveHandKey, getCorrectAction } from '../strategy/lookup'
import type { AiProfile } from './profiles'

export interface AiDecision {
  action: Action
  state: number
}

/** One AI decision, base = basic strategy, warped by the profile's habits. */
export function decideAiAction(
  profile: AiProfile,
  cards: Card[],
  dealerUp: Rank,
  av: Availability,
  rngState: number
): AiDecision {
  let state = rngState
  const { total, soft } = evaluateHand(cards)

  // Superstitious: never bust for the table.
  if (profile.neverBust && !soft && total >= 12) {
    if (isPairHand(cards) && pairRank(cards) === 'A' && av.canSplit) {
      return { action: 'split', state }
    }
    return { action: 'stand', state }
  }

  // Tourist: play like the dealer.
  if (profile.mimicDealer) {
    if (isPairHand(cards) && pairRank(cards) === 'A' && av.canSplit) {
      return { action: 'split', state }
    }
    return { action: total < 17 ? 'hit' : 'stand', state }
  }

  // Occasionally split tens because they're "due".
  if (profile.splitTensRate > 0 && pairRank(cards) === '10' && av.canSplit) {
    const roll = rngNext(state)
    state = roll.state
    if (roll.value < profile.splitTensRate) return { action: 'split', state }
  }

  const effectiveAv: Availability = {
    ...av,
    canSurrender: av.canSurrender && !profile.neverSurrender,
  }
  const key = deriveHandKey(cards, effectiveAv)
  let action = getCorrectAction(key, dealerUp, effectiveAv, 'basic', 0).action

  if (profile.alwaysStandSoft18 && soft && total === 18) action = 'stand'
  if (profile.neverDoubleSoft && soft && action === 'double') action = 'hit'

  // Random slip: swap hit<->stand.
  const slip = rngNext(state)
  state = slip.state
  if (slip.value < profile.slipRate) {
    if (action === 'hit') action = 'stand'
    else if (action === 'stand') action = 'hit'
  }

  return { action, state }
}

export function decideAiBet(
  profile: AiProfile,
  tableMin: number,
  tableMax: number,
  rngState: number
): { bet: number; state: number } {
  const span = profile.betUnits.max - profile.betUnits.min + 1
  const r = rngInt(rngState, span)
  const units = profile.betUnits.min + r.value
  return { bet: Math.min(tableMin * units, tableMax), state: r.state }
}

export function decideAiInsurance(
  profile: AiProfile,
  rngState: number
): { take: boolean; state: number } {
  const r = rngNext(rngState)
  return { take: r.value < profile.insuranceRate, state: r.state }
}
