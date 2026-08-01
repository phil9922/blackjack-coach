import { useState } from 'react'
import type { StatsApi } from '../hooks/useStats'
import type { TrainingMode } from '../engine/types'
import { SKILLS, skillLevel, playerRank, skillForm } from '../gamify/skills'
import { ACHIEVEMENTS } from '../gamify/achievements'
import { SpeedDrillModal } from './SpeedDrillModal'
import type { CountSystem } from '../counting/systems'

export function SkillsScreen({
  stats,
  mode,
  system,
}: {
  stats: StatsApi
  mode: TrainingMode
  system: CountSystem
}) {
  const [speedDrill, setSpeedDrill] = useState(false)
  const s = stats.stats
  const rank = playerRank(s.skillXp)
  const unlockedCount = Object.keys(s.achievements).length

  return (
    <div className="stats">
      <h2 className="screen-title">Skills</h2>

      <section className="panel rank-card">
        <div className="rank-card__main">
          <span className="rank-card__title">{rank.title}</span>
          <span className="rank-card__sub">
            player rank {rank.level} · {rank.xp.toLocaleString()} XP
            {rank.ceiling !== null && ` · ${(rank.ceiling - rank.xp).toLocaleString()} XP to the next rank`}
          </span>
        </div>
        <div className="xp-bar xp-bar--rank" role="progressbar" aria-valuenow={Math.round(rank.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="xp-bar__fill" style={{ width: `${rank.progress * 100}%` }} />
        </div>
        <p className="panel__sub rank-card__note">
          XP comes from correct plays — streaks and drilled hands pay extra, hints pay almost
          nothing. Mastering a skill means levelling it up <em>and</em> keeping it on form.
        </p>
      </section>

      <div className="skill-grid">
        {SKILLS.map((skill) => {
          const xp = s.skillXp[skill.id] ?? 0
          const lvl = skillLevel(xp)
          const form = skillForm(s, skill.id)
          const dormant = skill.countingOnly && mode !== 'counting' && xp === 0
          return (
            <section key={skill.id} className={`panel skill-card ${dormant ? 'skill-card--dormant' : ''}`}>
              <div className="skill-card__head">
                <span className="skill-card__glyph" aria-hidden="true">
                  {skill.glyph}
                </span>
                <div>
                  <h3 className="skill-card__name">{skill.name}</h3>
                  <span className="skill-card__level">
                    {lvl.title} · level {lvl.level}
                  </span>
                </div>
                {form.onForm && <span className="skill-card__form-badge">on form</span>}
              </div>
              <div className="xp-bar" title={`${xp} XP${lvl.ceiling !== null ? ` — ${lvl.ceiling - xp} to ${lvl.title === 'Expert' ? 'Master' : 'next level'}` : ''}`}>
                <div className="xp-bar__fill" style={{ width: `${lvl.progress * 100}%` }} />
              </div>
              <p className="skill-card__desc">{skill.description}</p>
              <p className="skill-card__stats">
                {skill.id === 'count'
                  ? `${xp} XP · ${s.speedDrills.correct}/${s.speedDrills.runs} speed drills${
                      s.speedDrills.bestPace ? ` · best ${s.speedDrills.bestPace} cards/min` : ''
                    }`
                  : dormant
                    ? 'Switch to card counting mode to train this skill.'
                    : form.pct !== null
                      ? `${xp} XP · form ${form.pct}% over last ${form.windowSeen} · ${form.seen} lifetime plays`
                      : `${xp} XP · no plays yet`}
              </p>
              {skill.id === 'count' && (
                <button className="btn btn--ghost skill-card__practice" onClick={() => setSpeedDrill(true)}>
                  Speed drill →
                </button>
              )}
            </section>
          )
        })}
      </div>

      {speedDrill && (
        <SpeedDrillModal
          system={system}
          onClose={() => setSpeedDrill(false)}
          onFinish={(score) => stats.recordSpeedDrill(score)}
        />
      )}

      <section className="panel">
        <h3 className="panel__title">
          Badges · {unlockedCount}/{ACHIEVEMENTS.length}
        </h3>
        <div className="badge-grid">
          {ACHIEVEMENTS.map((a) => {
            const at = s.achievements[a.id]
            return (
              <div key={a.id} className={`badge ${at ? 'badge--unlocked' : ''}`}>
                <span className="badge__glyph" aria-hidden="true">
                  {a.glyph}
                </span>
                <strong className="badge__name">{a.name}</strong>
                <span className="badge__desc">{at ? a.description : a.hint}</span>
                {at && (
                  <span className="badge__date">
                    {new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
