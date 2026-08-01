import { useEffect, useReducer, useRef } from 'react'
import type { GameState, GameAction } from '../engine/game'
import { gameReducer, initGame, activeSeat, DEFAULT_SETTINGS } from '../engine/game'
import { DEFAULT_RULES, DEFAULT_BUY_IN } from '../engine/rules'
import { loadPersisted } from '../stats/storage'
import type { StatsApi } from './useStats'

/** milliseconds between visible AI/dealer steps */
const TICK_MS = 650

export interface PersistedConfig {
  rules: typeof DEFAULT_RULES
  settings: typeof DEFAULT_SETTINGS
  buyIn: number
}

export const DEFAULT_CONFIG: PersistedConfig = {
  rules: DEFAULT_RULES,
  settings: DEFAULT_SETTINGS,
  buyIn: DEFAULT_BUY_IN,
}

export function useGame(stats: StatsApi): [GameState, React.Dispatch<GameAction>] {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    // Deep-merge defaults so settings added in newer versions (e.g. drillMode)
    // exist even when an older saved config is loaded.
    const persisted = loadPersisted(DEFAULT_CONFIG)
    return initGame({
      ...persisted,
      rules: { ...DEFAULT_RULES, ...persisted.rules },
      settings: { ...DEFAULT_SETTINGS, ...persisted.settings },
    })
  })

  // Drive AI seats and the dealer at a watchable pace.
  useEffect(() => {
    if (state.awaitingAck) return
    const aiTurn = state.phase === 'seatTurn' && activeSeat(state)?.kind === 'ai'
    if (!aiTurn && state.phase !== 'dealerTurn') return
    const t = setTimeout(() => dispatch({ type: 'ADVANCE' }), TICK_MS)
    return () => clearTimeout(t)
  }, [state])

  // Record each grade exactly once.
  const seenGrade = useRef(0)
  useEffect(() => {
    if (state.gradeSeq !== seenGrade.current && state.lastGrade) {
      seenGrade.current = state.gradeSeq
      stats.recordDecision(state.lastGrade, state.settings.mode)
    }
  }, [state.gradeSeq, state.lastGrade, state.settings.mode, stats])

  // Record outcomes + bankroll once per settled round.
  const seenRound = useRef(0)
  useEffect(() => {
    if (state.phase === 'roundOver' && state.handsPlayed !== seenRound.current && state.roundResults) {
      seenRound.current = state.handsPlayed
      stats.recordOutcomes(state.roundResults.filter((r) => r.isUser), state.settings.mode)
      stats.recordBankroll(state.userBankroll)
    }
  }, [state.phase, state.handsPlayed, state.roundResults, state.userBankroll, state.settings.mode, stats])

  // Record quiz results.
  const seenQuiz = useRef<object | null>(null)
  useEffect(() => {
    if (state.lastQuiz && state.lastQuiz !== seenQuiz.current) {
      seenQuiz.current = state.lastQuiz
      stats.recordQuiz(state.lastQuiz)
    }
  }, [state.lastQuiz, stats])

  return [state, dispatch]
}
