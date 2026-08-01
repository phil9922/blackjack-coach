import { useState } from 'react'
import type { StatsState } from '../stats/model'
import { loadApiKey } from '../stats/storage'
import { buildDigest, hasEnoughHistory } from '../coach-ai/summary'
import { requestCoachRead, COACH_ERROR_TEXT, type CoachError } from '../coach-ai/client'

/** Minimal renderer for the coach's prose: headings and paragraphs only. */
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
  mode,
  bankroll,
  totalBuyIn,
}: {
  stats: StatsState
  mode: string
  bankroll: number
  totalBuyIn: number
}) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [read, setRead] = useState<string | null>(null)
  const [error, setError] = useState<CoachError | null>(null)

  const hasKey = loadApiKey().length > 0
  const ready = hasEnoughHistory(stats)

  const run = async () => {
    setStatus('loading')
    setError(null)
    const result = await requestCoachRead(
      loadApiKey(),
      buildDigest(stats, { mode, bankroll, totalBuyIn })
    )
    setStatus('idle')
    if (result.ok) setRead(result.text)
    else setError(result.error)
  }

  return (
    <section className="panel panel--ai">
      <div className="drill-head">
        <h3 className="panel__title">AI coach</h3>
        <button
          className="btn btn--primary"
          disabled={status === 'loading' || !hasKey || !ready}
          onClick={run}
        >
          {status === 'loading' ? 'Reading your record…' : read ? 'Ask again' : 'Get a read on my play'}
        </button>
      </div>

      <p className="panel__sub">
        Sends a summary of your stats — accuracy, detected tendencies, worst matchups, trends; never
        your API key's other data — to Claude for a written read on how you play. Optional, off
        unless you press the button, and it's the only part of this app that talks to a server.
      </p>

      {!hasKey && (
        <p className="ai-coach__notice">
          Add your own Claude API key in Settings to turn this on. Everything else in the app works
          without it.
        </p>
      )}
      {hasKey && !ready && (
        <p className="ai-coach__notice">
          Play a bit more first — the coach needs at least 20 graded decisions to say anything
          worth reading.
        </p>
      )}

      {status === 'loading' && (
        <p className="ai-coach__notice">Thinking about your last {stats.handsPlayed} hands…</p>
      )}

      {error && (
        <p className="ai-coach__error">
          {error.kind === 'other' ? error.message : COACH_ERROR_TEXT[error.kind]}
        </p>
      )}

      {read && <CoachProse text={read} />}
    </section>
  )
}
