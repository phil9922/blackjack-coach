import type { GameState, GameAction } from '../engine/game'
import { activeSeat, activeHand, availabilityFor } from '../engine/game'
import type { Action } from '../strategy/types'

export function Controls({
  state,
  dispatch,
  onHint,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  onHint: () => void
}) {
  const seat = activeSeat(state)
  const hand = activeHand(state)
  if (!seat || !hand || seat.kind !== 'user' || state.awaitingAck) return null

  const av = availabilityFor(state, seat, hand)
  const act = (action: Action) => dispatch({ type: 'PLAYER_ACTION', action })

  return (
    <div className="controls" role="group" aria-label="Your move">
      <button className="btn btn--action" onClick={() => act('hit')}>
        Hit <kbd>H</kbd>
      </button>
      <button className="btn btn--action" onClick={() => act('stand')}>
        Stand <kbd>S</kbd>
      </button>
      <button className="btn btn--action" disabled={!av.canDouble} onClick={() => act('double')}>
        Double <kbd>D</kbd>
      </button>
      <button className="btn btn--action" disabled={!av.canSplit} onClick={() => act('split')}>
        Split <kbd>P</kbd>
      </button>
      {state.rules.surrenderAllowed && (
        <button className="btn btn--action" disabled={!av.canSurrender} onClick={() => act('surrender')}>
          Surrender <kbd>R</kbd>
        </button>
      )}
      <button className="btn btn--hint" onClick={onHint}>
        What should I do?
      </button>
    </div>
  )
}
