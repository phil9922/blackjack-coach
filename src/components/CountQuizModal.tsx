import { useState } from 'react'
import type { GameAction } from '../engine/game'
import type { CountSystem } from '../counting/systems'

export function CountQuizModal({
  dispatch,
  system,
}: {
  dispatch: React.Dispatch<GameAction>
  system: CountSystem
}) {
  const [running, setRunning] = useState('')
  const [trueC, setTrueC] = useState('')

  // Unbalanced systems never convert to a true count, so asking for one would
  // be teaching a step that doesn't exist in the system being practised.
  const asksTrue = system.balanced
  const ready = running !== '' && (!asksTrue || trueC !== '')

  const submit = () => {
    if (!ready) return
    dispatch({
      type: 'QUIZ_SUBMIT',
      running: Number(running),
      trueCountAnswer: asksTrue ? Number(trueC) : 0,
    })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Count quiz">
      <div className="modal">
        <h2 className="modal__title">Count check</h2>
        <p>The dealer pauses to shuffle her chips. Quick — where's the count?</p>
        <label className="modal__field">
          Running count ({system.name})
          <input
            type="number"
            value={running}
            autoFocus
            onChange={(e) => setRunning(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {asksTrue && (
          <label className="modal__field">
            True count (running ÷ decks left, ±0.5 is fine)
            <input
              type="number"
              step="0.5"
              value={trueC}
              onChange={(e) => setTrueC(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
        )}
        {!asksTrue && (
          <p className="modal__note">
            {system.name} is unbalanced — you play straight off the running count, so there's
            no true count to work out.
          </p>
        )}
        <button className="btn btn--primary" disabled={!ready} onClick={submit}>
          Answer
        </button>
      </div>
    </div>
  )
}
