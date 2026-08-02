import type { GameState, GameAction } from '../engine/game'
import type { Hint } from '../strategy/hint'
import type { CoachTip } from '../stats/coach'
import type { XpEvent } from '../stats/model'
import { useState } from 'react'
import { SKILL_BY_ID, type SkillId } from '../gamify/skills'
import { loadApiKey } from '../stats/storage'
import type { AiCoachApi } from '../hooks/useAiCoach'
import type { StatsApi } from '../hooks/useStats'
import { RewindButton } from './RewindButton'
import { AskCoachModal } from './AskCoachModal'
import type { BetAdvice } from '../betting/advisor'

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
  coach,
  stats,
  betAdvice,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  hint: Hint | null
  /** present only while the player is sizing a bet */
  betAdvice: BetAdvice | null
  coachTip: CoachTip | null
  onDismissTip: () => void
  lastXp: XpEvent | null
  notice: GamifyNotice | null
  onDismissNotice: () => void
  coach: AiCoachApi
  stats: StatsApi
}) {
  const grade = state.lastGrade
  const xpSkill = lastXp ? SKILL_BY_ID[lastXp.skill as SkillId] : null

  // The live coach interrupts only for something newly worth stopping for, so
  // it is silent most of the time by design. This is the way to ask it outright.
  const [asking, setAsking] = useState(false)
  const hasKey = loadApiKey().length > 0
  const aiAlert = coach.alert
  const aiBusy = coach.busy

  return (
    <aside className="rail" aria-label="Coaching">
      <div className="rail__head">
        <h2 className="rail__title">Verdict rail</h2>
        {hasKey && (
          <button
            className="btn btn--ask"
            onClick={() => setAsking(true)}
            title="Ask Claude about your play — opens with a review prefilled, or ask your own question"
          >
            ✦ Ask AI coach
          </button>
        )}
      </div>

      {/* Sizing the bet is a decision like any other, so its reasoning lives
          where every other explanation does — not crowding the dock. */}
      {betAdvice && (
        <div className="verdict verdict--bet">
          <span className="verdict__stamp">BET</span>
          <h3 className="verdict__headline">Suggested bet: ${betAdvice.amount}</h3>
          <p className="verdict__body">{betAdvice.reason}</p>
        </div>
      )}

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
          {grade.replayed && (
            <p className="verdict__note">Replay after a rewind — not counted.</p>
          )}
          <div className="verdict__actions">
            {state.awaitingAck && (
              <button className="btn btn--primary" onClick={() => dispatch({ type: 'ACKNOWLEDGE' })}>
                Got it — continue
              </button>
            )}
            <RewindButton state={state} dispatch={dispatch} variant="rail" />
          </div>
        </div>
      )}

      {!grade && !hint && !betAdvice && (
        <p className="rail__empty">
          Play a hand. Every decision you make gets graded against the book here — with the why,
          not just the what.
        </p>
      )}

      {aiAlert && (
        <div className="verdict verdict--ai">
          <span className="verdict__stamp">✦ AI COACH</span>
          <h3 className="verdict__headline">Your AI coach noticed something</h3>
          <p className="verdict__body">{aiAlert}</p>
          <p className="verdict__note">Written by Claude from your stats — not a graded verdict.</p>
          <button className="btn btn--ghost" onClick={coach.dismissAlert}>
            Got it
          </button>
        </div>
      )}

      {aiBusy && !aiAlert && (
        <p className="rail__working">AI coach is reviewing your last few hands…</p>
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

      {asking && (
        <AskCoachModal
          stats={stats.stats}
          mode={state.settings.mode}
          bankroll={state.userBankroll}
          totalBuyIn={state.totalBuyIn}
          onClose={() => setAsking(false)}
        />
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
