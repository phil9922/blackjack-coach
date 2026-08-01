import type { StatsApi } from '../hooks/useStats'
import {
  overallAccuracy,
  accuracyByCategory,
  accuracyTrend,
  topMistakes,
  outcomeMatrix,
  worstMatchups,
  BUCKETS,
  UP_ORDER,
} from '../stats/analysis'
import { coachReport } from '../stats/coach'
import { ACTION_LABELS } from '../strategy/explanations'
import type { Action } from '../strategy/types'

const CAT_LABELS: Record<string, string> = {
  hard: 'Hard totals',
  soft: 'Soft hands',
  pair: 'Pairs',
  surrender: 'Surrender',
  deviation: 'Count deviations',
  insurance: 'Insurance',
}

function actionLabel(a: string): string {
  if (a === 'take-insurance') return 'take insurance'
  if (a === 'decline-insurance') return 'decline insurance'
  return ACTION_LABELS[a as Action]?.toLowerCase() ?? a
}

/** Diverging tint: warm terracotta for losing EV, steel blue for winning, neutral near zero. */
function evTint(ev: number | null): string {
  if (ev === null) return 'transparent'
  const t = Math.max(-1, Math.min(1, ev))
  if (Math.abs(t) < 0.05) return 'var(--paper-dim)'
  return t < 0
    ? `rgba(179, 69, 44, ${Math.min(0.12 + Math.abs(t) * 0.45, 0.55)})`
    : `rgba(49, 97, 143, ${Math.min(0.12 + t * 0.45, 0.55)})`
}

export function StatsScreen({
  stats,
  bankroll,
  totalBuyIn,
}: {
  stats: StatsApi
  bankroll: number
  totalBuyIn: number
}) {
  const s = stats.stats
  const overall = overallAccuracy(s)
  const byCat = accuracyByCategory(s)
  const trend = accuracyTrend(s)
  const mistakes = topMistakes(s)
  const matrix = outcomeMatrix(s.outcomes)
  const matchups = worstMatchups(s.outcomes)
  const report = coachReport(s)
  const net = bankroll - totalBuyIn
  const assisted = s.decisions.filter((d) => d.hinted).length

  if (s.decisions.length === 0 && s.outcomes.length === 0) {
    return (
      <div className="stats">
        <h2 className="screen-title">Your record</h2>
        <p className="stats__empty">
          Nothing on the books yet. Play some hands — every decision and every outcome lands here,
          and the coach starts looking for patterns once there's history to read.
        </p>
      </div>
    )
  }

  return (
    <div className="stats">
      <h2 className="screen-title">Your record</h2>

      <div className="tiles">
        <div className="tile tile--hero">
          <span className="tile__value">{overall.pct ?? '—'}%</span>
          <span className="tile__label">decision accuracy · {overall.seen} graded plays</span>
        </div>
        <div className="tile">
          <span className="tile__value">{s.streak.current}</span>
          <span className="tile__label">streak (best {s.streak.best})</span>
        </div>
        <div className="tile">
          <span className="tile__value">{s.handsPlayed}</span>
          <span className="tile__label">hands played</span>
        </div>
        <div className="tile">
          <span className={`tile__value ${net > 0 ? 'is-win' : net < 0 ? 'is-loss' : ''}`}>
            {net >= 0 ? '+' : '−'}${Math.abs(net)}
          </span>
          <span className="tile__label">net vs ${totalBuyIn} bought in</span>
        </div>
        {s.countQuizzes.asked > 0 && (
          <div className="tile">
            <span className="tile__value">
              {Math.round((s.countQuizzes.rcCorrect / s.countQuizzes.asked) * 100)}%
            </span>
            <span className="tile__label">count quizzes ({s.countQuizzes.asked})</span>
          </div>
        )}
        {s.betAdvice.rounds > 0 && (
          <div className="tile">
            <span className="tile__value">
              {Math.round((s.betAdvice.followed / s.betAdvice.rounds) * 100)}%
            </span>
            <span className="tile__label">bet advice followed</span>
          </div>
        )}
        {assisted > 0 && (
          <div className="tile">
            <span className="tile__value">{assisted}</span>
            <span className="tile__label">assisted plays (not graded)</span>
          </div>
        )}
      </div>

      <section className="panel panel--coach">
        <h3 className="panel__title">Coach's read</h3>
        {report.trendSummary && <p className="coach__trend">{report.trendSummary}</p>}
        {report.focus && (
          <p className="coach__focus">
            <strong>Practice next:</strong> {report.focus}
          </p>
        )}
        {report.outcomeInsights.map((line, i) => (
          <p key={i} className="coach__insight">
            {line}
          </p>
        ))}
        {report.tips.length === 0 && !report.focus && (
          <p>No leaks detected yet — the coach speaks up once patterns repeat.</p>
        )}
        {(['mistake', 'missed-opportunity'] as const).map((bucket) => {
          const tips = report.tips.filter((t) => t.bucket === bucket)
          if (tips.length === 0) return null
          return (
            <div key={bucket} className="coach__bucket">
              <h4 className="coach__bucket-title">
                {bucket === 'mistake' ? 'Costing you money' : 'Missed opportunities'}
              </h4>
              {tips.map((t) => (
                <div key={t.id} className="coach__tip">
                  <strong>{t.title}</strong>
                  <span className="coach__tip-count">
                    {t.count}
                    {t.opportunities > 0 ? ` of ${t.opportunities} chances` : '×'}
                  </span>
                  <p>{t.tip}</p>
                </div>
              ))}
            </div>
          )
        })}
      </section>

      {mistakes.length > 0 && (
        <section className="panel">
          <h3 className="panel__title">Your most-repeated mistakes</h3>
          <ul className="mistakes">
            {mistakes.map((m) => (
              <li key={`${m.keyStr}|${m.up}`} className="mistakes__item">
                <span className="mistakes__spot">
                  {m.keyLabel} vs {m.up}
                </span>
                <span className="mistakes__detail">
                  wrong {m.wrong} of {m.seen} times — you {actionLabel(m.mostCommonWrongAction)} when
                  the book says <strong>{actionLabel(m.correctAction)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h3 className="panel__title">Accuracy by decision type</h3>
        <table className="cat-table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Graded</th>
              <th scope="col">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byCat)
              .filter(([, a]) => a.seen > 0)
              .map(([cat, a]) => (
                <tr key={cat}>
                  <th scope="row">{CAT_LABELS[cat]}</th>
                  <td>{a.seen}</td>
                  <td>
                    <div className="acc-bar" title={`${a.correct} of ${a.seen} correct`}>
                      <div className="acc-bar__fill" style={{ width: `${a.pct}%` }} />
                      <span className="acc-bar__num">{a.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {trend.length >= 2 && (
        <section className="panel">
          <h3 className="panel__title">Accuracy over time</h3>
          <p className="panel__sub">Each bar is a window of 50 graded decisions, oldest first.</p>
          <div className="trend" role="img" aria-label={`Accuracy trend across ${trend.length} windows`}>
            {trend.map((p, i) => (
              <div key={i} className="trend__col" title={`Decisions ${p.label}: ${p.accuracy.pct}%`}>
                <div className="trend__bar" style={{ height: `${p.accuracy.pct}%` }} />
                {(i === 0 || i === trend.length - 1) && (
                  <span className="trend__num">{p.accuracy.pct}%</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {s.outcomes.length >= 10 && (
        <section className="panel">
          <h3 className="panel__title">Where your money goes</h3>
          <p className="panel__sub">
            Result per dollar bet, by starting hand and dealer upcard. Blue = winning you money, terracotta
            = losing. Some spots lose for everyone — the coach's read above flags where you run{' '}
            <em>worse than the book expects</em>.
          </p>
          <div className="matrix-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th scope="col">Your start</th>
                  {UP_ORDER.map((up) => (
                    <th key={up} scope="col">
                      {up}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUCKETS.map((b) => {
                  const row = matrix[b]
                  if (UP_ORDER.every((up) => !row[up])) return null
                  return (
                    <tr key={b}>
                      <th scope="row">{b}</th>
                      {UP_ORDER.map((up) => {
                        const cell = row[up]
                        return (
                          <td
                            key={up}
                            style={{ background: evTint(cell?.evPerBet ?? null) }}
                            title={
                              cell
                                ? `${b} vs ${up}: ${cell.wins}W ${cell.losses}L ${cell.pushes}P over ${cell.n} hands, net $${cell.net}`
                                : 'no hands yet'
                            }
                          >
                            {cell ? (
                              <>
                                <span className="matrix__ev">
                                  {cell.evPerBet !== null && cell.evPerBet > 0 ? '+' : ''}
                                  {cell.evPerBet !== null ? Math.round(cell.evPerBet * 100) : ''}¢
                                </span>
                                <span className="matrix__n">{cell.n}</span>
                              </>
                            ) : (
                              <span className="matrix__none">·</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {matchups.length > 0 && (
            <ul className="matchups">
              {matchups.slice(0, 3).map((m) => (
                <li key={`${m.bucket}|${m.up}`}>
                  <strong>
                    {m.bucket} vs {m.up}:
                  </strong>{' '}
                  losing {Math.round(m.lossRate * 100)}% of {m.n} hands (
                  {m.evPerBet >= 0 ? '+' : ''}
                  {Math.round(m.evPerBet * 100)}¢/$ vs {m.expectedEvPerBet >= 0 ? '+' : ''}
                  {Math.round(m.expectedEvPerBet * 100)}¢ expected)
                  {m.underperforming ? ' — worse than the book; likely a leak.' : ' — near expectation; just a hard spot.'}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {s.bankrollHistory.length >= 2 && (
        <section className="panel">
          <h3 className="panel__title">Bankroll</h3>
          <svg
            className="spark"
            viewBox="0 0 300 60"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Bankroll over the last ${s.bankrollHistory.length} rounds, currently $${bankroll}`}
          >
            {(() => {
              const h = s.bankrollHistory
              const min = Math.min(...h)
              const max = Math.max(...h)
              const span = max - min || 1
              const pts = h
                .map(
                  (v, i) =>
                    `${(i / (h.length - 1)) * 300},${55 - ((v - min) / span) * 50}`
                )
                .join(' ')
              return <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" />
            })()}
          </svg>
          <p className="panel__sub">
            Last {s.bankrollHistory.length} rounds · currently ${bankroll}
          </p>
        </section>
      )}

      <section className="panel panel--danger">
        <button
          className="btn btn--ghost"
          onClick={() => {
            if (window.confirm('Wipe all training history? This cannot be undone.')) stats.reset()
          }}
        >
          Reset all stats
        </button>
      </section>
    </div>
  )
}
