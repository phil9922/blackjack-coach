import { useState } from 'react'
import type { StatsState } from '../stats/model'
import { loadApiKey } from '../stats/storage'
import { buildDigest, hasEnoughHistory } from '../coach-ai/summary'
import { requestCoachRead, COACH_ERROR_TEXT, type CoachError } from '../coach-ai/client'
import type { AiCoachApi } from '../hooks/useAiCoach'
import type { AiCoachItem } from '../coach-ai/live'

function errorText(e: CoachError): string {
  return e.kind === 'other' ? e.message : COACH_ERROR_TEXT[e.kind]
}

function ItemList({ items, tone }: { items: AiCoachItem[]; tone: 'good' | 'work' | 'tip' }) {
  if (items.length === 0) return null
  return (
    <ul className="ai-list">
      {items.map((item, i) => (
        <li key={i} className={`ai-list__item ai-list__item--${tone}`}>
          <strong>{item.title}</strong>
          <p>{item.detail}</p>
        </li>
      ))}
    </ul>
  )
}

/** Minimal renderer for the long-form read: headings and paragraphs only. */
function CoachProse({ text }: { text: string }) {
  return (
    <div className="ai-coach__prose">
      {text.split(/\n{2,}/).map((para, i) => {
        const trimmed = para.trim()
        if (!trimmed) return null
        if (trimmed.startsWith('## ')) {
          return (
            <h4 key={i} className="ai-coach__heading">
              {trimmed.slice(3)}
            </h4>
          )
        }
        return <p key={i}>{trimmed}</p>
      })}
    </div>
  )
}

export function AiCoachPanel({
  stats,
  coach,
  mode,
  bankroll,
  totalBuyIn,
  liveFrequency,
}: {
  stats: StatsState
  coach: AiCoachApi
  mode: string
  bankroll: number
  totalBuyIn: number
  liveFrequency: string
}) {
  const [readStatus, setReadStatus] = useState<'idle' | 'loading'>('idle')
  const [read, setRead] = useState<string | null>(null)
  const [readError, setReadError] = useState<CoachError | null>(null)

  const hasKey = loadApiKey().length > 0
  const ready = hasEnoughHistory(stats)
  const a = coach.assessment

  const runRead = async () => {
    setReadStatus('loading')
    setReadError(null)
    const result = await requestCoachRead(
      loadApiKey(),
      buildDigest(stats, { mode, bankroll, totalBuyIn })
    )
    setReadStatus('idle')
    if (result.ok) setRead(result.text)
    else setReadError(result.error)
  }

  return (
    <section className="panel panel--ai">
      <div className="drill-head">
        <h3 className="panel__title">
          AI coach {liveFrequency !== 'off' && hasKey && <span className="ai-live-dot">live</span>}
        </h3>
        <button
          className="btn btn--ghost"
          disabled={coach.busy || !hasKey || !ready}
          onClick={coach.refresh}
        >
          {coach.busy ? 'Reviewing…' : 'Update now'}
        </button>
      </div>

      {!hasKey && (
        <p className="ai-coach__notice">
          Add your Claude API key in Settings to turn this on. Everything else in the app works
          without it.
        </p>
      )}
      {hasKey && !ready && (
        <p className="ai-coach__notice">
          Play a bit more first — the coach needs at least 20 graded decisions before it can spot a
          pattern worth naming.
        </p>
      )}
      {hasKey && ready && liveFrequency === 'off' && !a && (
        <p className="ai-coach__notice">
          Live coaching is off. Turn it on in Settings to have the coach watch as you play, or press
          Update now for a one-off review.
        </p>
      )}
      {coach.error && <p className="ai-coach__error">{errorText(coach.error)}</p>}

      {a && (
        <>
          <p className="panel__sub ai-coach__stamp">
            Updated after hand {a.handsAtLastRun} ·{' '}
            {new Date(a.updatedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>

          <div className="ai-cols">
            <div>
              <h4 className="coach__bucket-title">What you're doing well</h4>
              {a.doingWell.length ? (
                <ItemList items={a.doingWell} tone="good" />
              ) : (
                <p className="overview__empty">Nothing locked in yet.</p>
              )}
            </div>
            <div>
              <h4 className="coach__bucket-title">What's costing you</h4>
              {a.needsWork.length ? (
                <ItemList items={a.needsWork} tone="work" />
              ) : (
                <p className="overview__empty">No repeating leaks right now.</p>
              )}
            </div>
          </div>

          {a.tips.length > 0 && (
            <>
              <h4 className="coach__bucket-title">Try this next</h4>
              <ItemList items={a.tips} tone="tip" />
            </>
          )}
        </>
      )}

      {hasKey && ready && (
        <div className="ai-coach__read">
          <button className="btn btn--ghost" disabled={readStatus === 'loading'} onClick={runRead}>
            {readStatus === 'loading'
              ? 'Writing…'
              : read
                ? 'Write another read'
                : 'Ask for a written read'}
          </button>
          <span className="ai-coach__read-hint">
            A few paragraphs on how you play, rather than the list above.
          </span>
        </div>
      )}
      {readError && <p className="ai-coach__error">{errorText(readError)}</p>}
      {read && <CoachProse text={read} />}
    </section>
  )
}
