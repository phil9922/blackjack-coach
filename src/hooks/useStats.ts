import { useCallback, useMemo, useState } from 'react'
import type { TrainingMode } from '../engine/types'
import type { SettledHandRecord, QuizResult } from '../engine/game'
import type { GradedDecision, Availability } from '../strategy/types'
import { handKeyToString, handKeyLabel } from '../strategy/types'
import { deriveHandKey } from '../strategy/lookup'
import type { StatsState } from '../stats/model'
import { pushCapped, DECISION_CAP, OUTCOME_CAP, BANKROLL_CAP } from '../stats/model'
import { loadStats, saveStats, resetStats } from '../stats/storage'

const OPEN: Availability = { canDouble: true, canSplit: true, canSurrender: true }

export interface StatsApi {
  stats: StatsState
  recordDecision: (grade: GradedDecision, mode: TrainingMode) => void
  recordOutcomes: (results: SettledHandRecord[], mode: TrainingMode) => void
  recordQuiz: (quiz: QuizResult) => void
  recordBetAdvice: (followed: boolean) => void
  recordBankroll: (value: number) => void
  reset: () => void
}

export function useStats(): StatsApi {
  const [stats, setStats] = useState<StatsState>(loadStats)

  const update = useCallback((fn: (s: StatsState) => StatsState) => {
    setStats((prev) => {
      const next = fn(prev)
      saveStats(next)
      return next
    })
  }, [])

  const recordDecision = useCallback(
    (grade: GradedDecision, mode: TrainingMode) => {
      update((s) => {
        const streak = grade.hinted
          ? s.streak
          : grade.wasCorrect
            ? { current: s.streak.current + 1, best: Math.max(s.streak.best, s.streak.current + 1) }
            : { current: 0, best: s.streak.best }
        return {
          ...s,
          streak,
          decisions: pushCapped(
            s.decisions,
            {
              t: Date.now(),
              mode,
              keyStr: grade.key ? handKeyToString(grade.key) : 'insurance',
              keyLabel: grade.key ? handKeyLabel(grade.key) : 'insurance',
              up: grade.dealerUp,
              chosen: grade.chosen,
              correct: grade.correct,
              wasCorrect: grade.wasCorrect,
              category: grade.category,
              source: grade.source,
              hinted: grade.hinted,
              drilled: grade.drilled ?? false,
              tc: grade.trueCountAtDecision,
            },
            DECISION_CAP
          ),
        }
      })
    },
    [update]
  )

  const recordOutcomes = useCallback(
    (results: SettledHandRecord[], mode: TrainingMode) => {
      update((s) => {
        let outcomes = s.outcomes
        for (const r of results) {
          const key = deriveHandKey(r.startingCards, OPEN)
          outcomes = pushCapped(
            outcomes,
            {
              t: Date.now(),
              mode,
              startKeyStr: handKeyToString(key),
              startLabel: handKeyLabel(key),
              up: r.dealerUp,
              result: r.result,
              net: r.net,
              bet: r.bet,
              wasSplitHand: r.wasSplitHand,
            },
            OUTCOME_CAP
          )
        }
        return { ...s, outcomes, handsPlayed: s.handsPlayed + results.length }
      })
    },
    [update]
  )

  const recordQuiz = useCallback(
    (quiz: QuizResult) => {
      update((s) => ({
        ...s,
        countQuizzes: {
          asked: s.countQuizzes.asked + 1,
          rcCorrect: s.countQuizzes.rcCorrect + (quiz.runningCorrect ? 1 : 0),
          tcCorrect: s.countQuizzes.tcCorrect + (quiz.trueCorrect ? 1 : 0),
        },
      }))
    },
    [update]
  )

  const recordBetAdvice = useCallback(
    (followed: boolean) => {
      update((s) => ({
        ...s,
        betAdvice: {
          rounds: s.betAdvice.rounds + 1,
          followed: s.betAdvice.followed + (followed ? 1 : 0),
        },
      }))
    },
    [update]
  )

  const recordBankroll = useCallback(
    (value: number) => {
      update((s) => ({ ...s, bankrollHistory: pushCapped(s.bankrollHistory, value, BANKROLL_CAP) }))
    },
    [update]
  )

  const reset = useCallback(() => {
    resetStats()
    setStats(loadStats())
  }, [])

  return useMemo(
    () => ({ stats, recordDecision, recordOutcomes, recordQuiz, recordBetAdvice, recordBankroll, reset }),
    [stats, recordDecision, recordOutcomes, recordQuiz, recordBetAdvice, recordBankroll, reset]
  )
}
