import type { GameState } from '../engine/game'
import { activeSeat, activeHand, availabilityFor, currentTrueCount } from '../engine/game'
import { normalizeRank } from '../engine/cards'
import { deriveHandKey, getCorrectAction } from './lookup'
import { explainDecision, ACTION_LABELS } from './explanations'
import type { Action, Explanation } from './types'

export interface Hint {
  action: Action
  explanation: Explanation
}

/** "What should I do?" — the correct play plus the why, before acting. */
export function hintFor(state: GameState): Hint | null {
  const seat = activeSeat(state)
  const hand = activeHand(state)
  if (!seat || !hand || seat.kind !== 'user') return null
  const av = availabilityFor(state, seat, hand)
  const key = deriveHandKey(hand.cards, av)
  const up = normalizeRank(state.dealerCards[0].rank)
  const tc = currentTrueCount(state)
  const correct = getCorrectAction(key, up, av, state.settings.mode, tc)
  const base = explainDecision(
    key,
    up,
    correct,
    correct.action,
    state.settings.mode === 'counting' ? tc : undefined
  )
  return {
    action: correct.action,
    explanation: { headline: `Play: ${ACTION_LABELS[correct.action]}`, body: base.body },
  }
}
