import { useState } from 'react'
import type { GameAction } from '../engine/game'

export function CountQuizModal({ dispatch }: { dispatch: React.Dispatch<GameAction> }) {
  const [running, setRunning] = useState('')
  const [trueC, setTrueC] = useState('')

  const submit = () => {
    dispatch({
      type: 'QUIZ_SUBMIT',
      running: Number(running),
      trueCountAnswer: Number(trueC),
    })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Count quiz">
      <div className="modal">
        <h2 className="modal__title">Count check</h2>
        <p>The dealer pauses to shuffle her chips. Quick — where's the count?</p>
        <label className="modal__field">
          Running count
          <input
            type="number"
            value={running}
            autoFocus
            onChange={(e) => setRunning(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && running !== '' && trueC !== '' && submit()}
          />
        </label>
        <label className="modal__field">
          True count (running ÷ decks left, ±0.5 is fine)
          <input
            type="number"
            step="0.5"
            value={trueC}
            onChange={(e) => setTrueC(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && running !== '' && trueC !== '' && submit()}
          />
        </label>
        <button className="btn btn--primary" disabled={running === '' || trueC === ''} onClick={submit}>
          Answer
        </button>
      </div>
    </div>
  )
}
