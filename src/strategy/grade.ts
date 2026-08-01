import type { Card, Rank, TrainingMode } from '../engine/types'
import type { Availability, DecisionCategory, Action, GradedDecision } from './types'
import { deriveHandKey, getCorrectAction } from './lookup'
import { explainDecision, explainInsurance } from './explanations'
import { INSURANCE_INDEX } from './deviations'

export interface GradeInput {
  chosen: Action
  cards: Card[]
  dealerUp: Rank
  av: Availability
  mode: TrainingMode
  trueCount: number
  hinted: boolean
}

export function gradeDecision(input: GradeInput): GradedDecision {
  const key = deriveHandKey(input.cards, input.av)
  const correct = getCorrectAction(key, input.dealerUp, input.av, input.mode, input.trueCount)

  let category: DecisionCategory
  if (correct.source === 'deviation') category = 'deviation'
  else if (correct.action === 'surrender') category = 'surrender'
  else category = key.kind

  return {
    chosen: input.chosen,
    correct: correct.action,
    wasCorrect: input.chosen === correct.action,
    key,
    dealerUp: input.dealerUp,
    category,
    source: correct.source,
    trueCountAtDecision: input.mode === 'counting' ? input.trueCount : undefined,
    hinted: input.hinted,
    explanation: explainDecision(key, input.dealerUp, correct, input.chosen, input.mode === 'counting' ? input.trueCount : undefined),
  }
}

export function gradeInsurance(
  took: boolean,
  mode: TrainingMode,
  trueCount: number,
  /** the player holds a natural, so this was offered as "even money" */
  evenMoney = false
): GradedDecision {
  const correctTake = mode === 'counting' && trueCount >= INSURANCE_INDEX
  return {
    chosen: took ? 'take-insurance' : 'decline-insurance',
    correct: correctTake ? 'take-insurance' : 'decline-insurance',
    wasCorrect: took === correctTake,
    key: null,
    dealerUp: 'A',
    category: 'insurance',
    source: correctTake ? 'deviation' : 'basic',
    trueCountAtDecision: mode === 'counting' ? trueCount : undefined,
    hinted: false,
    explanation: explainInsurance(took, correctTake, mode, trueCount, evenMoney),
  }
}
