import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState } from '../engine/game'
import type { StatsApi } from './useStats'
import { loadApiKey } from '../stats/storage'
import { buildDigest } from '../coach-ai/summary'
import { runLiveAnalysis, shouldRunLive, type AiCoachState } from '../coach-ai/live'
import { overallAccuracy } from '../stats/analysis'
import type { CoachError } from '../coach-ai/client'

export interface AiCoachApi {
  /** the running assessment, or null before the first successful run */
  assessment: AiCoachState | null
  busy: boolean
  error: CoachError | null
  /** a newly-detected pattern worth interrupting play for */
  alert: string | null
  dismissAlert: () => void
  /** force a refresh now (Progress screen button) */
  refresh: () => void
}

/**
 * Drives the live coach: watches play, fires an analysis every N hands once
 * there's new evidence, and surfaces a one-line alert when the coach spots
 * something newly worth interrupting for.
 */
export function useAiCoach(state: GameState, stats: StatsApi): AiCoachApi {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CoachError | null>(null)
  const [alert, setAlert] = useState<string | null>(null)
  const busyRef = useRef(false)
  const seenAlert = useRef<string>('')

  const assessment = stats.stats.aiCoach

  const run = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError(null)

    const snapshotHands = state.handsPlayed
    const snapshotDecisions = overallAccuracy(stats.stats).seen
    const result = await runLiveAnalysis(
      loadApiKey(),
      buildDigest(stats.stats, {
        mode: state.settings.mode,
        bankroll: state.userBankroll,
        totalBuyIn: state.totalBuyIn,
      }),
      assessment
    )

    busyRef.current = false
    setBusy(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    stats.saveAiCoach({
      ...result.assessment,
      updatedAt: Date.now(),
      handsAtLastRun: snapshotHands,
      decisionsAtLastRun: snapshotDecisions,
    })
    if (result.assessment.alert && result.assessment.alert !== seenAlert.current) {
      seenAlert.current = result.assessment.alert
      setAlert(result.assessment.alert)
    }
  }, [state.handsPlayed, state.settings.mode, state.userBankroll, state.totalBuyIn, stats, assessment])

  // Fire between hands, never mid-hand — the analysis is about patterns, and
  // interrupting a decision with one would defeat the point.
  useEffect(() => {
    if (state.phase !== 'roundOver') return
    const ready = shouldRunLive({
      frequency: state.settings.liveCoach,
      hasKey: loadApiKey().length > 0,
      handsPlayed: state.handsPlayed,
      gradedDecisions: overallAccuracy(stats.stats).seen,
      busy: busyRef.current,
      previous: assessment,
    })
    if (ready) void run()
  }, [state.phase, state.handsPlayed, state.settings.liveCoach, stats.stats, assessment, run])

  return {
    assessment,
    busy,
    error,
    alert,
    dismissAlert: () => setAlert(null),
    refresh: () => void run(),
  }
}
