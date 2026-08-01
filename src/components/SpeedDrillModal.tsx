import { useEffect, useMemo, useRef, useState } from 'react'
import { CardView } from './CardView'
import {
  SPEEDS,
  DECK_SIZES,
  buildSpeedDrill,
  scoreSpeedDrill,
  type DrillSpeed,
  type SpeedDrillScore,
} from '../drill/speedDrill'
import type { CountSystem } from '../counting/systems'

type Stage = 'setup' | 'counting' | 'answer' | 'result'

export function SpeedDrillModal({
  onClose,
  onFinish,
  system,
}: {
  onClose: () => void
  onFinish: (score: SpeedDrillScore) => void
  system: CountSystem
}) {
  const [stage, setStage] = useState<Stage>('setup')
  const [speed, setSpeed] = useState<DrillSpeed>('table')
  const [size, setSize] = useState<number>(26)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState<SpeedDrillScore | null>(null)
  const [run, setRun] = useState(() => buildSpeedDrill(26, 1, system))
  const reported = useRef(false)

  const ms = SPEEDS.find((s) => s.id === speed)!.ms

  const start = () => {
    setRun(buildSpeedDrill(size, Math.floor(Math.random() * 2 ** 31), system))
    setIndex(0)
    setAnswer('')
    setScore(null)
    reported.current = false
    setStage('counting')
  }

  // Advance the card stream.
  useEffect(() => {
    if (stage !== 'counting') return
    if (index >= run.cards.length) {
      setStage('answer')
      return
    }
    const t = setTimeout(() => setIndex((i) => i + 1), ms)
    return () => clearTimeout(t)
  }, [stage, index, ms, run.cards.length])

  const submit = () => {
    const s = scoreSpeedDrill(Number(answer), run.answer, run.cards.length, ms)
    setScore(s)
    setStage('result')
    if (!reported.current) {
      reported.current = true
      onFinish(s)
    }
  }

  const current = run.cards[index]
  const progress = useMemo(
    () => (stage === 'counting' ? (index / run.cards.length) * 100 : 0),
    [stage, index, run.cards.length]
  )

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Count speed drill">
      <div className="modal modal--drill">
        {stage === 'setup' && (
          <>
            <h2 className="modal__title">Count speed drill</h2>
            <p>
              Cards come one at a time. Keep the running count in your head, then call it at the
              end. No penalty for a miss — this is where you build the reflex.
            </p>
            <fieldset className="speed-picker">
              <legend>Tempo</legend>
              {SPEEDS.map((s) => (
                <label key={s.id} className={`speed-opt ${speed === s.id ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name="speed"
                    checked={speed === s.id}
                    onChange={() => setSpeed(s.id)}
                  />
                  <strong>{s.label}</strong>
                  <span>{s.detail}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="speed-picker speed-picker--row">
              <legend>How many cards</legend>
              {DECK_SIZES.map((n) => (
                <label key={n} className={`speed-opt ${size === n ? 'is-on' : ''}`}>
                  <input type="radio" name="size" checked={size === n} onChange={() => setSize(n)} />
                  <strong>{n}</strong>
                  <span>{n === 26 ? 'half deck' : n === 52 ? 'one deck' : 'two decks'}</span>
                </label>
              ))}
            </fieldset>
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={start}>
                Start
              </button>
              <button className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        {stage === 'counting' && (
          <div className="speed-run">
            <div className="speed-run__bar">
              <div className="speed-run__fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="speed-run__card" aria-live="off">
              {current && <CardView key={index} card={current} />}
            </div>
            <p className="speed-run__count">
              {index + 1} / {run.cards.length}
            </p>
            <button className="btn btn--ghost" onClick={onClose}>
              Stop
            </button>
          </div>
        )}

        {stage === 'answer' && (
          <>
            <h2 className="modal__title">What's the running count?</h2>
            <label className="modal__field">
              Running count
              <input
                type="number"
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && answer !== '' && submit()}
              />
            </label>
            <div className="modal__actions">
              <button className="btn btn--primary" disabled={answer === ''} onClick={submit}>
                Call it
              </button>
            </div>
          </>
        )}

        {stage === 'result' && score && (
          <>
            <h2 className="modal__title">
              {score.correct ? 'Dead on.' : `Off by ${Math.abs(score.off)}`}
            </h2>
            <p>
              The count was <strong>{run.answer >= 0 ? '+' : ''}{run.answer}</strong>; you called{' '}
              {Number(answer) >= 0 ? '+' : ''}
              {answer}. {run.cards.length} cards at {score.pace} cards per minute.
            </p>
            <p className="speed-result__xp">+{score.xp} XP · Keeping the Count</p>
            {!score.correct && (
              <p className="panel__sub">
                Drill the tags in pairs — a low card and a ten cancel to zero, so you only carry the
                leftovers. Most counters run the deck in pairs rather than adding one card at a time.
              </p>
            )}
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={start}>
                Again
              </button>
              <button className="btn btn--ghost" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
