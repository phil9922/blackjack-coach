import type { GameState, GameAction } from '../engine/game'
import { canRewind } from '../engine/game'

/**
 * Takes back the last decision. The grade it earned stays on the record — this
 * replays the hand so you can see how the right play would have gone, not so you
 * can score it again.
 */
export function RewindButton({
  state,
  dispatch,
  variant = 'dock',
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  /** 'rail' sits beside the verdict; 'dock' sits with the action buttons. */
  variant?: 'rail' | 'dock'
}) {
  if (!canRewind(state)) return null

  return (
    <button
      className={`btn btn--rewind ${variant === 'rail' ? 'btn--rewind-rail' : ''}`}
      onClick={() => dispatch({ type: 'REWIND' })}
      title="Take back your last decision and replay it — the grade you already earned still stands"
    >
      ↩ Rewind <kbd>Z</kbd>
    </button>
  )
}
