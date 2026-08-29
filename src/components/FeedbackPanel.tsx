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
import type { GradedDecision } from '../strategy/types'
import { handKeyLabel } from '../strategy/types'

export interface GamifyNotice {
  kind: 'levelup' | 'badge'
  text: string
}

export interface VerdictEntry {
  /** state.gradeSeq at the moment this verdict landed — stable across re-renders */
  id: number
  grade: GradedDecision
  xp: XpEvent | null
}

function handLabel(grade: GradedDecision): string {
  return grade.key ? `${handKeyLabel(grade.key)} vs ${grade.dealerUp}` : 'Insurance'
}

export function FeedbackPanel({
  state,
  dispatch,
  hint,
  coachTip,
  onDismissTip,
  verdictHistory,
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
  /** every graded decision this session, newest first — a running record, not a single card */
  verdictHistory: VerdictEntry[]
  notice: GamifyNotice | null
  onDismissNotice: () => void
  coach: AiCoachApi
  stats: StatsApi
}) {
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

      {verdictHistory.length > 0 && (
        <div className="verdict-timeline">
          {verdictHistory.map((entry, i) => {
            const isLatest = i === 0
            const grade = entry.grade
            const xpSkill = entry.xp ? SKILL_BY_ID[entry.xp.skill as SkillId] : null
            return (
              <div
                key={entry.id}
                className={`verdict ${grade.wasCorrect ? 'verdict--book' : 'verdict--miss'}`}
              >
                <span className="verdict__hand">{handLabel(grade)}</span>
                <span className="verdict__stamp">{grade.wasCorrect ? 'BOOK' : 'MISS'}</span>
                <h3 className="verdict__headline">{grade.explanation.headline}</h3>
                <p className="verdict__body">{grade.explanation.body}</p>
                {entry.xp && xpSkill && (
                  <span className="verdict__xp">
                    +{entry.xp.amount} XP · {xpSkill.name}
                  </span>
                )}
                {grade.hinted && <p className="verdict__note">Assisted (hint used) — not counted.</p>}
                {grade.replayed && (
                  <p className="verdict__note">Replay after a rewind — not counted.</p>
                )}
                {/* Rewind and acknowledge act on the live hand, so only the newest
                    entry — the one still tied to current game state — gets them. */}
                {isLatest && (
                  <div className="verdict__actions">
                    {state.awaitingAck && (
                      <button
                        className="btn btn--primary"
                        onClick={() => dispatch({ type: 'ACKNOWLEDGE' })}
                      >
                        Got it — continue
                      </button>
                    )}
                    <RewindButton state={state} dispatch={dispatch} variant="rail" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {verdictHistory.length === 0 && !hint && !betAdvice && (
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
