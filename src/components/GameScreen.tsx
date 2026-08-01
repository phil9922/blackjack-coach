import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameState, GameAction } from '../engine/game'
import { activeSeat, currentTrueCount, cardsRemaining, userSeat } from '../engine/game'
import { evaluateHand } from '../engine/hand'
import { CardView } from './CardView'
import { SeatView } from './SeatView'
import { Controls } from './Controls'
import { BetControls } from './BetControls'
import { FeedbackPanel } from './FeedbackPanel'
import { CountQuizModal } from './CountQuizModal'
import { hintFor, type Hint } from '../strategy/hint'
import type { StatsApi } from '../hooks/useStats'
import { coachTips, type CoachTip } from '../stats/coach'
import type { Action } from '../strategy/types'

export function GameScreen({
  state,
  dispatch,
  stats,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  stats: StatsApi
}) {
  const [hint, setHint] = useState<Hint | null>(null)
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null)
  const lastCoachAt = useRef(0)
  const shownTips = useRef<Set<string>>(new Set())

  const isUserTurn = state.phase === 'seatTurn' && activeSeat(state)?.kind === 'user'

  // Clear the hint as soon as the situation moves on.
  useEffect(() => {
    if (!isUserTurn) setHint(null)
  }, [isUserTurn, state.activeHandIndex, state.gradeSeq])

  // Surface a coach tip at most once per 10 rounds, only when one newly qualifies.
  useEffect(() => {
    if (state.phase !== 'roundOver') return
    if (state.handsPlayed - lastCoachAt.current < 10) return
    const tips = coachTips(stats.stats)
    const fresh = tips.find((t) => !shownTips.current.has(t.id))
    if (fresh) {
      shownTips.current.add(fresh.id)
      lastCoachAt.current = state.handsPlayed
      setCoachTip(fresh)
    }
  }, [state.phase, state.handsPlayed, stats.stats])

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const keys: Record<string, Action> = {
        h: 'hit',
        s: 'stand',
        d: 'double',
        p: 'split',
        r: 'surrender',
      }
      const action = keys[e.key.toLowerCase()]
      if (action && isUserTurn && !state.awaitingAck) {
        dispatch({ type: 'PLAYER_ACTION', action })
      }
      if (e.key === '?' && isUserTurn) {
        requestHint()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const requestHint = () => {
    const h = hintFor(state)
    if (h) {
      setHint(h)
      dispatch({ type: 'USE_HINT' })
    }
  }

  const onDeal = (amount: number, advised: number) => {
    stats.recordBetAdvice(Math.abs(amount - advised) <= state.rules.tableMin / 2)
    dispatch({ type: 'PLACE_BET_AND_DEAL', amount })
  }

  const dealerValue = useMemo(() => {
    if (state.dealerCards.length === 0) return null
    if (!state.holeRevealed) {
      const up = evaluateHand([state.dealerCards[0]])
      return `showing ${up.total}`
    }
    const v = evaluateHand(state.dealerCards)
    return v.total > 21 ? `bust (${v.total})` : `${v.soft ? 'soft ' : ''}${v.total}`
  }, [state.dealerCards, state.holeRevealed])

  const userNet = state.roundResults
    ?.filter((r) => r.isUser)
    .reduce((s, r) => s + r.net, 0)

  return (
    <div className="game">
      <div className="table" data-phase={state.phase}>
        {state.justShuffled && (
          <div className="shuffle-notice">Cut card reached — fresh shoe, count resets to 0</div>
        )}

        <section className="dealer" aria-label="Dealer">
          <div className="dealer__label">
            Dealer {dealerValue && <span className="dealer__total">{dealerValue}</span>}
          </div>
          <div className="dealer__cards">
            {state.dealerCards.map((c, i) => (
              <CardView key={i} card={c} hidden={i === 1 && !state.holeRevealed} />
            ))}
          </div>
        </section>

        {state.settings.mode === 'counting' && state.settings.showCount && (
          <div className="count-chip" title="Running count / true count">
            RC {state.runningCount >= 0 ? '+' : ''}
            {state.runningCount} · TC {currentTrueCount(state) >= 0 ? '+' : ''}
            {currentTrueCount(state)} · {Math.round(cardsRemaining(state) / 52 * 10) / 10} decks left
          </div>
        )}

        <section className="seats" aria-label="Players">
          {state.seats.map((seat, i) => (
            <SeatView
              key={seat.id}
              seat={seat}
              isActive={state.phase === 'seatTurn' && state.activeSeatIndex === i}
              activeHandIndex={state.activeHandIndex}
            />
          ))}
        </section>

        <section className="dock">
          {state.phase === 'betting' && (
            <BetControls state={state} dispatch={dispatch} onDeal={onDeal} />
          )}

          {state.phase === 'insurance' && userSeat(state).insurance === null && (
            <div className="insurance" role="group" aria-label="Insurance">
              <p className="insurance__ask">Dealer shows an ace. Insurance?</p>
              <button className="btn btn--action" onClick={() => dispatch({ type: 'INSURANCE', take: true })}>
                Take insurance (${userSeat(state).hands[0].bet / 2})
              </button>
              <button className="btn btn--action" onClick={() => dispatch({ type: 'INSURANCE', take: false })}>
                No insurance
              </button>
            </div>
          )}

          <Controls state={state} dispatch={dispatch} onHint={requestHint} />

          {state.phase === 'seatTurn' && activeSeat(state)?.kind === 'ai' && (
            <p className="dock__waiting">{activeSeat(state)?.name} is playing…</p>
          )}
          {state.phase === 'dealerTurn' && <p className="dock__waiting">Dealer plays…</p>}

          {state.phase === 'roundOver' && (
            <div className="round-over">
              <span className={`round-over__net ${userNet !== undefined && userNet > 0 ? 'is-win' : userNet !== undefined && userNet < 0 ? 'is-loss' : ''}`}>
                {userNet !== undefined && userNet > 0 ? `+$${userNet}` : userNet !== undefined && userNet < 0 ? `-$${-userNet}` : 'Push'}
                {state.insuranceNet !== 0 && ` (incl. insurance ${state.insuranceNet > 0 ? '+' : ''}$${state.insuranceNet})`}
              </span>
              <button className="btn btn--primary" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
                Next hand
              </button>
            </div>
          )}
        </section>
      </div>

      <FeedbackPanel
        state={state}
        dispatch={dispatch}
        hint={hint}
        coachTip={coachTip}
        onDismissTip={() => setCoachTip(null)}
      />

      {state.phase === 'countQuiz' && <CountQuizModal dispatch={dispatch} />}
      {state.lastQuiz && state.phase === 'betting' && (
        <div className="quiz-result">
          <strong>{state.lastQuiz.runningCorrect && state.lastQuiz.trueCorrect ? 'Count on target.' : 'Count drifted.'}</strong>{' '}
          Running was {state.lastQuiz.actualRunning >= 0 ? '+' : ''}
          {state.lastQuiz.actualRunning} (you said {state.lastQuiz.answerRunning >= 0 ? '+' : ''}
          {state.lastQuiz.answerRunning}); true was {state.lastQuiz.actualTrueExact.toFixed(1)} (you
          said {state.lastQuiz.answerTrue}).
        </div>
      )}
    </div>
  )
}
