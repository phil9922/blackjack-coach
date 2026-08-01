import { useCallback, useMemo, useState } from 'react'
import type { TrainingMode } from '../engine/types'
import type { SettledHandRecord, QuizResult } from '../engine/game'
import type { GradedDecision, Availability } from '../strategy/types'
import { handKeyToString, handKeyLabel } from '../strategy/types'
import { deriveHandKey } from '../strategy/lookup'
import type { StatsState } from '../stats/model'
import { pushCapped, DECISION_CAP, OUTCOME_CAP, BANKROLL_CAP } from '../stats/model'
import { loadStats, saveStats, resetStats } from '../stats/storage'
import {
  skillForDecision,
  xpForDecision,
  XP_QUIZ_RUNNING,
  XP_QUIZ_TRUE,
  XP_BET_ADVICE,
} from '../gamify/skills'
import { evaluateAchievements } from '../gamify/achievements'

const OPEN: Availability = { canDouble: true, canSplit: true, canSurrender: true }

function addXp(s: StatsState, skill: string, amount: number): StatsState {
  if (amount <= 0) return s
  return {
    ...s,
    skillXp: { ...s.skillXp, [skill]: (s.skillXp[skill] ?? 0) + amount },
    lastXp: { skill, amount, t: Date.now() },
  }
}

export interface StatsApi {
  stats: StatsState
  recordDecision: (grade: GradedDecision, mode: TrainingMode) => void
  recordOutcomes: (results: SettledHandRecord[], mode: TrainingMode) => void
  recordQuiz: (quiz: QuizResult) => void
  recordBetAdvice: (followed: boolean, mode: TrainingMode) => void
  recordBankroll: (value: number) => void
  reset: () => void
}

export function useStats(): StatsApi {
  const [stats, setStats] = useState<StatsState>(loadStats)

  const update = useCallback((fn: (s: StatsState) => StatsState) => {
    setStats((prev) => {
      let next = fn(prev)
      const earned = evaluateAchievements(next)
      if (earned.length > 0) {
        const stamped = { ...next.achievements }
        for (const id of earned) stamped[id] = Date.now()
        next = { ...next, achievements: stamped }
      }
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
        const skill = skillForDecision({
          category: grade.category,
          correct: String(grade.correct),
          chosen: String(grade.chosen),
          keyStr: grade.key ? handKeyToString(grade.key) : 'insurance',
        })
        const xp = xpForDecision({
          wasCorrect: grade.wasCorrect,
          hinted: grade.hinted,
          drilled: grade.drilled ?? false,
          streakAfter: streak.current,
        })
        return {
          ...addXp(s, skill, xp),
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
      update((s) => {
        const xp = (quiz.runningCorrect ? XP_QUIZ_RUNNING : 0) + (quiz.trueCorrect ? XP_QUIZ_TRUE : 0)
        return {
          ...addXp(s, 'count', xp),
          countQuizzes: {
            asked: s.countQuizzes.asked + 1,
            rcCorrect: s.countQuizzes.rcCorrect + (quiz.runningCorrect ? 1 : 0),
            tcCorrect: s.countQuizzes.tcCorrect + (quiz.trueCorrect ? 1 : 0),
          },
        }
      })
    },
    [update]
  )

  const recordBetAdvice = useCallback(
    (followed: boolean, mode: TrainingMode) => {
      update((s) => {
        const base = {
          ...s,
          betAdvice: {
            rounds: s.betAdvice.rounds + 1,
            followed: s.betAdvice.followed + (followed ? 1 : 0),
          },
        }
        // Bet sizing is only a skill when there's a count to size against.
        return followed && mode === 'counting' ? addXp(base, 'countplay', XP_BET_ADVICE) : base
      })
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
