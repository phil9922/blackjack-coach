import { useState } from 'react'
import type { GameState, GameAction } from '../engine/game'
import type { BetAdvice } from '../betting/advisor'

const CHIPS = [5, 25, 100, 500]

export function BetControls({
  state,
  dispatch,
  onDeal,
  advice,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  onDeal: (amount: number, advised: number) => void
  /** computed once by GameScreen — the rail explains it, the dock just uses it */
  advice: BetAdvice
}) {
  const [bet, setBet] = useState(state.userBet)
  const { tableMin, tableMax } = state.rules
  const broke = state.userBankroll < tableMin
  const clamp = (n: number) => Math.max(0, Math.min(n, Math.min(tableMax, state.userBankroll)))

  return (
    <div className="bet-controls">
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
            {/* The amount rides on the button, so the number is one glance away
                without a card of its own. The reasoning is on the rail. */}
            <button
              className="btn btn--ghost bet-controls__suggest"
              onClick={() => setBet(clamp(advice.amount))}
              title={advice.reason}
            >
              Use suggested <strong>${advice.amount}</strong>
            </button>
            <button
              className="btn btn--primary"
              disabled={bet < tableMin || bet > tableMax || bet > state.userBankroll}
              onClick={() => onDeal(bet, advice.amount)}
            >
              Deal — ${bet}
            </button>
            <span className="bet-controls__limits">
              ${tableMin}–${tableMax}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
