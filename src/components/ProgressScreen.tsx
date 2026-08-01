import type { StatsApi } from '../hooks/useStats'
import type { GameState, GameAction } from '../engine/game'
import { coachReport, strengths } from '../stats/coach'
import { deriveSessions } from '../stats/sessions'
import { buildDrillPlan, drillTargets } from '../drill/planner'
import { savePersisted } from '../stats/storage'

function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTime(t: number): string {
  return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function ProgressScreen({
  stats,
  state,
  dispatch,
}: {
  stats: StatsApi
  state: GameState
  dispatch: React.Dispatch<GameAction>
}) {
  const report = coachReport(stats.stats)
  const strong = strengths(stats.stats)
  const sessions = deriveSessions(stats.stats)
  const settings = state.pendingSettings ?? state.settings
  const targets = drillTargets(buildDrillPlan(stats.stats))

  const toggleDrill = () => {
    const next = { ...settings, drillMode: !settings.drillMode }
    dispatch({ type: 'UPDATE_SETTINGS', settings: next })
    savePersisted({ rules: state.pendingRules ?? state.rules, settings: next, buyIn: state.totalBuyIn })
  }

  if (stats.stats.decisions.length === 0) {
    return (
      <div className="stats">
        <h2 className="screen-title">Progress</h2>
        <p className="stats__empty">
          No history yet. Play some hands first — this page becomes your training journal: what
          you're doing right, what's costing you, and a log of every session.
        </p>
      </div>
    )
  }

  return (
    <div className="stats">
      <h2 className="screen-title">Progress</h2>

      <section className="panel panel--coach">
        <h3 className="panel__title">Overview</h3>
        {report.trendSummary && <p className="coach__trend">{report.trendSummary}</p>}

        <div className="overview">
          <div className="overview__col">
            <h4 className="coach__bucket-title">What you're doing right</h4>
            {strong.length === 0 && (
              <p className="overview__empty">
                Nothing locked in yet — strengths show up here once an area holds up over volume.
              </p>
            )}
            {strong.map((s) => (
              <div key={s.title} className="overview__item overview__item--good">
                <strong>{s.title}</strong>
                <p>{s.detail}</p>
              </div>
            ))}
          </div>
          <div className="overview__col">
            <h4 className="coach__bucket-title">What needs work</h4>
            {report.tips.length === 0 && report.outcomeInsights.length === 0 && (
              <p className="overview__empty">No repeating leaks detected right now.</p>
            )}
            {report.tips.map((t) => (
              <div key={t.id} className="overview__item overview__item--work">
                <strong>{t.title}</strong>
                <p>{t.tip}</p>
              </div>
            ))}
            {report.outcomeInsights.map((line, i) => (
              <div key={i} className="overview__item overview__item--work">
                <p>{line}</p>
              </div>
            ))}
            {report.focus && (
              <p className="coach__focus">
                <strong>Practice next:</strong> {report.focus}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={`panel panel--drill ${settings.drillMode ? 'is-on' : ''}`}>
        <div className="drill-head">
          <h3 className="panel__title">Drill mode {settings.drillMode ? '· on' : '· off'}</h3>
          <button className={settings.drillMode ? 'btn btn--primary' : 'btn btn--ghost'} onClick={toggleDrill}>
            {settings.drillMode ? 'Turn off' : 'Turn on'}
          </button>
        </div>
        <p className="panel__sub">
          When on, the trainer learns where you struggle and stacks more deals into those spots
          (about 1 in 4 hands stays fully random so you can't see it coming). Cards are pulled
          forward from the real shoe, so the count stays honest. As a spot stops tripping you up,
          it fades from the rotation on its own.
        </p>
        {targets.length > 0 && (
          <>
            <h4 className="coach__bucket-title">Current rotation</h4>
            <ul className="drill-targets">
              {targets.map((t) => (
                <li key={t.label}>
                  <span className="drill-targets__label">{t.label}</span>
                  <span className="drill-targets__bar">
                    <span
                      className="drill-targets__fill"
                      style={{ width: `${Math.min(100, (t.weight / targets[0].weight) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <h3 className="panel__title">Session log</h3>
        <p className="panel__sub">
          Derived from your play history — a 45-minute break starts a new session.
        </p>
        <div className="matrix-wrap">
          <table className="sessions">
            <thead>
              <tr>
                <th scope="col">Session</th>
                <th scope="col">Hands</th>
                <th scope="col">Graded</th>
                <th scope="col">Accuracy</th>
                <th scope="col">Drilled</th>
                <th scope="col">Net</th>
                <th scope="col">Biggest issue</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.start}>
                  <td>
                    {fmtDate(s.start)} · {fmtTime(s.start)}–{fmtTime(s.end)}
                  </td>
                  <td>{s.hands}</td>
                  <td>{s.decisions}</td>
                  <td>{s.pct !== null ? `${s.pct}%` : '—'}</td>
                  <td>{s.drilled > 0 ? s.drilled : '—'}</td>
                  <td className={s.net > 0 ? 'is-win' : s.net < 0 ? 'is-loss' : ''}>
                    {s.net >= 0 ? '+' : '−'}${Math.abs(s.net)}
                  </td>
                  <td className="sessions__issue">{s.topIssue ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
