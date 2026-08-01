import type { GameState, GameAction } from '../engine/game'
import type { Hint } from '../strategy/hint'
import type { CoachTip } from '../stats/coach'
import type { XpEvent } from '../stats/model'
import { SKILL_BY_ID, type SkillId } from '../gamify/skills'

export interface GamifyNotice {
  kind: 'levelup' | 'badge'
  text: string
}

export function FeedbackPanel({
  state,
  dispatch,
  hint,
  coachTip,
  onDismissTip,
  lastXp,
  notice,
  onDismissNotice,
  aiAlert,
  aiBusy,
  onDismissAiAlert,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  hint: Hint | null
  coachTip: CoachTip | null
  onDismissTip: () => void
  lastXp: XpEvent | null
  notice: GamifyNotice | null
  onDismissNotice: () => void
  aiAlert: string | null
  aiBusy: boolean
  onDismissAiAlert: () => void
}) {
  const grade = state.lastGrade
  const xpSkill = lastXp ? SKILL_BY_ID[lastXp.skill as SkillId] : null

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
          {lastXp && xpSkill && (
            <span className="verdict__xp">
              +{lastXp.amount} XP · {xpSkill.name}
            </span>
          )}
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

      {aiAlert && (
        <div className="verdict verdict--ai">
          <span className="verdict__stamp">PATTERN</span>
          <h3 className="verdict__headline">Your coach noticed something</h3>
          <p className="verdict__body">{aiAlert}</p>
          <button className="btn btn--ghost" onClick={onDismissAiAlert}>
            Got it
          </button>
        </div>
      )}

      {aiBusy && !aiAlert && (
        <p className="rail__working">Coach is reviewing your last few hands…</p>
      )}

      {notice && (
        <div className="verdict verdict--gamify">
          <span className="verdict__stamp">{notice.kind === 'levelup' ? 'LEVEL UP' : 'BADGE'}</span>
          <h3 className="verdict__headline">{notice.text}</h3>
          <button className="btn btn--ghost" onClick={onDismissNotice}>
            Nice
          </button>
        </div>
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
