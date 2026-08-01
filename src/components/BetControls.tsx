import { useState } from 'react'
import type { GameState, GameAction } from '../engine/game'
import { currentTrueCount, countSystemOf } from '../engine/game'
import { suggestBet } from '../betting/advisor'

const CHIPS = [5, 25, 100, 500]

export function BetControls({
  state,
  dispatch,
  onDeal,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  onDeal: (amount: number, advised: number) => void
}) {
  const [bet, setBet] = useState(state.userBet)
  const { tableMin, tableMax } = state.rules
  const advice = suggestBet({
    mode: state.settings.mode,
    trueCount: currentTrueCount(state),
    bankroll: state.userBankroll,
    tableMin,
    tableMax,
    system: countSystemOf(state),
    runningCount: state.runningCount,
    decks: state.rules.decks,
  })
  const broke = state.userBankroll < tableMin
  const clamp = (n: number) => Math.max(0, Math.min(n, Math.min(tableMax, state.userBankroll)))

  return (
    <div className="bet-controls">
      <div className="bet-controls__advice">
        <span className="bet-controls__advice-amount">Suggested bet: ${advice.amount}</span>
        <p className="bet-controls__advice-reason">{advice.reason}</p>
      </div>

      {broke ? (
        <div className="bet-controls__rebuy">
          <p>You're below the ${tableMin} table minimum.</p>
          <button className="btn btn--primary" onClick={() => dispatch({ type: 'REBUY', amount: 500 })}>
            Re-buy $500
          </button>
        </div>
      ) : (
        <>
          <div className="bet-controls__builder">
            <span className="bet-controls__current">${bet}</span>
            {CHIPS.map((c) => (
              <button key={c} className={`chip chip--${c}`} onClick={() => setBet(clamp(bet + c))}>
                +{c}
              </button>
            ))}
            <button className="btn btn--ghost" onClick={() => setBet(0)}>
              Clear
            </button>
            <button className="btn btn--ghost" onClick={() => setBet(clamp(advice.amount))}>
              Use suggestion
            </button>
          </div>
          <div className="bet-controls__actions">
            <button
              className="btn btn--primary"
              disabled={bet < tableMin || bet > tableMax || bet > state.userBankroll}
              onClick={() => onDeal(bet, advice.amount)}
            >
              Deal — ${bet}
            </button>
            <span className="bet-controls__limits">
              Table ${tableMin}–${tableMax}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
