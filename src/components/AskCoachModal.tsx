import { useEffect, useRef, useState } from 'react'
import {
  askCoachQuestion,
  COACH_ERROR_TEXT,
  COACH_QUESTION_PRESETS,
  DEFAULT_COACH_QUESTION,
  type CoachError,
} from '../coach-ai/client'
import { buildDigest } from '../coach-ai/summary'
import { loadApiKey } from '../stats/storage'
import type { StatsState } from '../stats/model'

function errorText(e: CoachError): string {
  return e.kind === 'other' ? e.message : COACH_ERROR_TEXT[e.kind]
}

/**
 * Ask the coach something.
 *
 * Opens prefilled with the review you'd probably want anyway, so the common case
 * is one keystroke — but the text is yours to replace. Every call is billed to
 * the player's own key, so nothing fires until they press Ask.
 */
export function AskCoachModal({
  stats,
  mode,
  bankroll,
  totalBuyIn,
  onClose,
}: {
  stats: StatsState
  mode: string
  bankroll: number
  totalBuyIn: number
  onClose: () => void
}) {
  const [question, setQuestion] = useState(DEFAULT_COACH_QUESTION)
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<CoachError | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  // Open with the default selected: typing replaces it, Enter sends it.
  useEffect(() => {
    box.current?.focus()
    box.current?.select()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ask = async () => {
    if (!question.trim() || busy) return
    setBusy(true)
    setError(null)
    setAnswer(null)
    const result = await askCoachQuestion(
      loadApiKey(),
      buildDigest(stats, { mode, bankroll, totalBuyIn }),
      question
    )
    setBusy(false)
    if (result.ok) setAnswer(result.text)
    else setError(result.error)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Ask the AI coach">
      <div className="modal modal--ask">
        <h2 className="modal__title">Ask the AI coach</h2>
        <p className="modal__note">
          Claude answers from your record — accuracy by category, the cells you've missed, your
          trends. Never your raw hand history.
        </p>

        <textarea
          ref={box}
          className="ask__box"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter is a newline, as everywhere else.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void ask()
            }
          }}
          placeholder="Ask anything about how you play…"
        />

        <div className="ask__presets">
          {COACH_QUESTION_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className="ask__preset"
              onClick={() => setQuestion(p)}
              disabled={busy}
            >
              {p}
            </button>
          ))}
        </div>

        {error && <p className="ai-coach__error">{errorText(error)}</p>}

        {answer && (
          <div className="ask__answer">
            {answer.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        <div className="ask__actions">
          <button className="btn btn--primary" onClick={ask} disabled={busy || !question.trim()}>
            {busy ? 'Thinking…' : answer ? 'Ask again' : 'Ask'}
          </button>
          <button className="btn btn--ghost" onClick={onClose} disabled={busy}>
            {answer ? 'Done' : 'Cancel'}
          </button>
          <span className="ask__hint">One API call, billed to your key.</span>
        </div>
      </div>
    </div>
  )
}
