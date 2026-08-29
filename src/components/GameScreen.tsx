import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameState, GameAction } from '../engine/game'
import {
  activeSeat,
  currentTrueCount,
  cardsRemaining,
  countSystemOf,
  userSeat,
  isEvenMoneyOffer,
  canRewind,
} from '../engine/game'
import { evaluateHand } from '../engine/hand'
import { CardView } from './CardView'
import { SeatView } from './SeatView'
import { Controls } from './Controls'
import { RewindButton } from './RewindButton'
import { TableLayout } from './TableLayout'
import { ShoeView, ShoeAnchorContext } from './ShoeView'
import { suggestBet } from '../betting/advisor'
import { BetControls } from './BetControls'
import { FeedbackPanel, type GamifyNotice, type VerdictEntry } from './FeedbackPanel'
import { CountQuizModal } from './CountQuizModal'
import { SKILLS, skillLevel } from '../gamify/skills'
import { ACHIEVEMENTS } from '../gamify/achievements'
import { hintFor, type Hint } from '../strategy/hint'
import type { StatsApi } from '../hooks/useStats'
import { coachTips, type CoachTip } from '../stats/coach'
import { buildDrillPlan } from '../drill/planner'
import { sfx, setSoundEnabled } from '../audio/sfx'
import type { AiCoachApi } from '../hooks/useAiCoach'
import type { Action } from '../strategy/types'

export function GameScreen({
  state,
  dispatch,
  stats,
  coach,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  stats: StatsApi
  coach: AiCoachApi
}) {
  const shoeSlotRef = useRef<HTMLDivElement>(null)
  const [hint, setHint] = useState<Hint | null>(null)
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null)
  const [notice, setNotice] = useState<GamifyNotice | null>(null)
  const lastCoachAt = useRef(0)
  const shownTips = useRef<Set<string>>(new Set())
  const prevLevels = useRef<Record<string, number> | null>(null)
  const prevBadges = useRef<Set<string> | null>(null)

  useEffect(() => {
    setSoundEnabled(state.settings.soundEnabled)
  }, [state.settings.soundEnabled])

  // Card sounds follow the shoe, so AI and dealer draws are audible too.
  const prevCards = useRef(state.nextCard)
  useEffect(() => {
    if (state.nextCard > prevCards.current) sfx('card')
    prevCards.current = state.nextCard
  }, [state.nextCard])

  // Verdict chime, and the rail's running history — each graded decision joins
  // the timeline instead of replacing the last one, so a run of hands stays
  // readable as a record rather than a single card that keeps refreshing.
  const prevGrade = useRef(0)
  const [verdictHistory, setVerdictHistory] = useState<VerdictEntry[]>([])
  useEffect(() => {
    if (state.gradeSeq > prevGrade.current) {
      prevGrade.current = state.gradeSeq
      if (state.lastGrade) {
        sfx(state.lastGrade.wasCorrect ? 'correct' : 'miss')
        const grade = state.lastGrade
        setVerdictHistory((prev) =>
          [{ id: state.gradeSeq, grade, xp: stats.stats.lastXp }, ...prev].slice(0, 15)
        )
      }
    }
  }, [state.gradeSeq, state.lastGrade, stats.stats.lastXp])

  // Chips on a winning round.
  const prevSettled = useRef(0)
  useEffect(() => {
    if (state.phase === 'roundOver' && state.handsPlayed > prevSettled.current) {
      prevSettled.current = state.handsPlayed
      const net = state.roundResults?.filter((r) => r.isUser).reduce((s, r) => s + r.net, 0) ?? 0
      if (net > 0) sfx('chip')
    }
  }, [state.phase, state.handsPlayed, state.roundResults])

  // Level-up notices: compare each skill's level against the previous render.
  useEffect(() => {
    const levels: Record<string, number> = {}
    for (const sk of SKILLS) levels[sk.id] = skillLevel(stats.stats.skillXp[sk.id] ?? 0).level
    if (prevLevels.current) {
      for (const sk of SKILLS) {
        if (levels[sk.id] > (prevLevels.current[sk.id] ?? 1)) {
          const lvl = skillLevel(stats.stats.skillXp[sk.id] ?? 0)
          setNotice({ kind: 'levelup', text: `${sk.name} is now ${lvl.title} (level ${lvl.level})` })
          sfx('levelup')
        }
      }
    }
    prevLevels.current = levels
  }, [stats.stats.skillXp])

  // Badge notices: any newly unlocked achievement.
  useEffect(() => {
    const ids = new Set(Object.keys(stats.stats.achievements))
    if (prevBadges.current) {
      for (const id of ids) {
        if (!prevBadges.current.has(id)) {
          const meta = ACHIEVEMENTS.find((a) => a.id === id)
          if (meta) {
            setNotice({ kind: 'badge', text: `${meta.glyph} ${meta.name} — ${meta.description}` })
            sfx('levelup')
          }
        }
      }
    }
    prevBadges.current = ids
  }, [stats.stats.achievements])

  const isUserTurn = state.phase === 'seatTurn' && activeSeat(state)?.kind === 'user'

  // Clear the hint as soon as the situation moves on.
  useEffect(() => {
    if (!isUserTurn) setHint(null)
  }, [isUserTurn, state.activeHandIndex, state.gradeSeq])

  // On stacked (mobile) layouts the verdict rail sits below the table, so
  // bring feedback into view when it lands — and return to the controls once
  // a paused mistake is acknowledged.
  const isStacked = () => window.matchMedia('(max-width: 900px)').matches
  const prevAck = useRef(false)
  useEffect(() => {
    if (state.gradeSeq > 0 && isStacked()) {
      document.querySelector('.rail .verdict')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [state.gradeSeq])
  useEffect(() => {
    if (hint && isStacked()) {
      document.querySelector('.rail .verdict--hint')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [hint])
  useEffect(() => {
    if (prevAck.current && !state.awaitingAck && isStacked()) {
      document.querySelector('.dock')?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    prevAck.current = state.awaitingAck
  }, [state.awaitingAck])

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
      // Rewind is deliberately not gated on it being your turn — busting hands
      // the turn away, and that is exactly when you want to take the move back.
      if (e.key.toLowerCase() === 'z' && canRewind(state)) {
        dispatch({ type: 'REWIND' })
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
    stats.recordBetAdvice(Math.abs(amount - advised) <= state.rules.tableMin / 2, state.settings.mode)
    const drill = state.settings.drillMode
      ? buildDrillPlan(
          stats.stats,
          state.settings.mode,
          countSystemOf(state).supportsDeviations
        )
      : undefined
    dispatch({ type: 'PLACE_BET_AND_DEAL', amount, drill })
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

  const evenMoney = isEvenMoneyOffer(state)

  // Computed once and shared: the dock puts the number on a button, the rail
  // carries the reasoning. Only meaningful while a bet is being sized.
  const betAdvice =
    state.phase === 'betting'
      ? suggestBet({
          mode: state.settings.mode,
          trueCount: currentTrueCount(state),
          bankroll: state.userBankroll,
          tableMin: state.rules.tableMin,
          tableMax: state.rules.tableMax,
          system: countSystemOf(state),
          runningCount: state.runningCount,
          decks: state.rules.decks,
        })
      : null

  return (
    <div className="game">
      {/* Card size is a share of the felt divided by however many seats are on
          it, so adding players shrinks the cards instead of wrapping the row. */}
      <ShoeAnchorContext.Provider value={shoeSlotRef}>
      <div
        className="table"
        data-phase={state.phase}
        style={{ '--seats': state.seats.length } as React.CSSProperties}
      >
        {state.justShuffled && (
          <div className="shuffle-notice">Cut card reached — fresh shoe, count resets to 0</div>
        )}

        <ShoeView state={state} slotRef={shoeSlotRef} />

        <section className="dealer" aria-label="Dealer">
          <div className="dealer__label">
            Dealer {dealerValue && <span className="dealer__total">{dealerValue}</span>}
          </div>
          <div className="dealer__cards">
            {state.dealerCards.map((c, i) => {
              const isHole = i === 1
              const faceDown = isHole && !state.holeRevealed
              return (
                <CardView
                  // remounting on reveal is what re-fires the flip animation
                  key={`${i}-${faceDown ? 'down' : 'up'}`}
                  card={c}
                  hidden={faceDown}
                  flipIn={isHole && state.holeRevealed}
                />
              )
            })}
          </div>
        </section>

        {state.drilledLabel && state.phase !== 'betting' && (
          <div className="drill-chip" title="Drill mode stacked this deal toward one of your trouble spots">
            ◎ drill hand
          </div>
        )}

        {state.burnedCards.length > 0 && state.phase !== 'betting' && (
          <section className="burn" aria-label="Cards already dealt out of this shoe">
            <p className="burn__label">
              You sit down mid-shoe — {state.burnedCards.length} cards already in the discard tray.
              Count them like any other player's.
            </p>
            <div className="burn__cards">
              {state.burnedCards.map((c, i) => (
                <span
                  key={i}
                  className={`burn__card ${c.suit === '♥' || c.suit === '♦' ? 'is-red' : ''}`}
                >
                  {c.rank}
                  {c.suit}
                </span>
              ))}
            </div>
          </section>
        )}

        {state.settings.mode === 'counting' && state.settings.showCount && (
          <div
            className="count-chip"
            title={
              countSystemOf(state).balanced
                ? `${countSystemOf(state).name}: running count / true count`
                : `${countSystemOf(state).name}: unbalanced, so the running count is the signal`
            }
          >
            {countSystemOf(state).name} · RC {state.runningCount >= 0 ? '+' : ''}
            {state.runningCount}
            {countSystemOf(state).balanced && (
              <>
                {' '}· TC {currentTrueCount(state) >= 0 ? '+' : ''}
                {currentTrueCount(state)}
              </>
            )}{' '}
            · {Math.round((cardsRemaining(state) / 52) * 10) / 10} decks left
          </div>
        )}

        {/* The arc belongs between the dealer and the players, as on a real
            table — giving it its own band means it can never sit under a card. */}
        <TableLayout rules={state.rules} />

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
            <BetControls
              state={state}
              dispatch={dispatch}
              onDeal={onDeal}
              advice={betAdvice ?? { amount: state.rules.tableMin, reason: '' }}
            />
          )}

          {state.phase === 'insurance' && userSeat(state).insurance === null && (
            <div className="insurance" role="group" aria-label={evenMoney ? 'Even money' : 'Insurance'}>
              <p className="insurance__ask">
                {evenMoney
                  ? 'Blackjack! Dealer shows an ace — take even money?'
                  : 'Dealer shows an ace. Insurance?'}
              </p>
              <button className="btn btn--action" onClick={() => dispatch({ type: 'INSURANCE', take: true })}>
                {evenMoney
                  ? `Take even money ($${userSeat(state).hands[0].bet})`
                  : `Take insurance ($${userSeat(state).hands[0].bet / 2})`}
              </button>
              <button className="btn btn--action" onClick={() => dispatch({ type: 'INSURANCE', take: false })}>
                {evenMoney ? 'Let it ride' : 'No insurance'}
              </button>
            </div>
          )}

          {/* On a split, name the hand right above the buttons — the table shows
              which one is live, but this is where your eyes are when you act. */}
          {isUserTurn && !state.awaitingAck && userSeat(state).hands.length > 1 && (
            <p className="dock__hand">
              Playing <strong>hand {state.activeHandIndex + 1}</strong> of{' '}
              {userSeat(state).hands.length}
            </p>
          )}

          <Controls state={state} dispatch={dispatch} onHint={requestHint} />

          {/* Continue lives here as well as on the verdict rail, so a paused
              mistake can be cleared without crossing the screen to the sidebar. */}
          {(state.awaitingAck || canRewind(state)) && (
            <div className="dock__actions">
              {state.awaitingAck && (
                <button
                  className="btn btn--primary"
                  onClick={() => dispatch({ type: 'ACKNOWLEDGE' })}
                >
                  Got it — continue
                </button>
              )}
              <RewindButton state={state} dispatch={dispatch} />
            </div>
          )}

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
      </ShoeAnchorContext.Provider>

      <FeedbackPanel
        state={state}
        dispatch={dispatch}
        hint={hint}
        betAdvice={betAdvice}
        coachTip={coachTip}
        onDismissTip={() => setCoachTip(null)}
        verdictHistory={verdictHistory}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        coach={coach}
        stats={stats}
      />

      {state.phase === 'countQuiz' && (
        <CountQuizModal dispatch={dispatch} system={countSystemOf(state)} />
      )}
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
