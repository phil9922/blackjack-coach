import type { GameState, GameAction } from '../engine/game'
import type { Hint } from '../strategy/hint'
import type { CoachTip } from '../stats/coach'

export function FeedbackPanel({
  state,
  dispatch,
  hint,
  coachTip,
  onDismissTip,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  hint: Hint | null
  coachTip: CoachTip | null
  onDismissTip: () => void
}) {
  const grade = state.lastGrade

  return (
    <aside className="rail" aria-label="Coaching">
      <h2 className="rail__title">Verdict rail</h2>

      {hint && (
        <div className="verdict verdict--hint">
          <span className="verdict__stamp">HINT</span>
          <h3 className="verdict__headline">{hint.explanation.headline}</h3>
          <p className="verdict__body">{hint.explanation.body}</p>
          <p className="verdict__note">Hinted plays don't count toward your accuracy.</p>
        </div>
      )}

      {grade && (
        <div className={`verdict ${grade.wasCorrect ? 'verdict--book' : 'verdict--miss'}`}>
          <span className="verdict__stamp">{grade.wasCorrect ? 'BOOK' : 'MISS'}</span>
          <h3 className="verdict__headline">{grade.explanation.headline}</h3>
          <p className="verdict__body">{grade.explanation.body}</p>
          {grade.hinted && <p className="verdict__note">Assisted (hint used) — not counted.</p>}
          {state.awaitingAck && (
            <button className="btn btn--primary" onClick={() => dispatch({ type: 'ACKNOWLEDGE' })}>
              Got it — continue
            </button>
          )}
        </div>
      )}

      {!grade && !hint && (
        <p className="rail__empty">
          Play a hand. Every decision you make gets graded against the book here — with the why,
          not just the what.
        </p>
      )}

      {coachTip && (
        <div className="verdict verdict--coach">
          <span className="verdict__stamp">COACH</span>
          <h3 className="verdict__headline">{coachTip.title}</h3>
          <p className="verdict__body">{coachTip.tip}</p>
          <button className="btn btn--ghost" onClick={onDismissTip}>
            Dismiss
          </button>
        </div>
      )}
    </aside>
  )
}
