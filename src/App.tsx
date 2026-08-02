import { useState } from 'react'
import { useStats } from './hooks/useStats'
import { useGame } from './hooks/useGame'
import { GameScreen } from './components/GameScreen'
import { StatsScreen } from './components/StatsScreen'
import { ProgressScreen } from './components/ProgressScreen'
import { SkillsScreen } from './components/SkillsScreen'
import { SettingsScreen } from './components/SettingsScreen'
import type { TrainingMode } from './engine/types'
import {
  savePersisted,
  getProfiles,
  getActiveProfile,
  createProfile,
  switchProfile,
} from './stats/storage'
import { countSystemOf } from './engine/game'
import { playerRank } from './gamify/skills'
import { useAiCoach } from './hooks/useAiCoach'

type Screen = 'table' | 'skills' | 'stats' | 'progress' | 'settings'

const SCREEN_LABELS: Record<Screen, string> = {
  table: 'Table',
  skills: 'Skills',
  stats: 'Stats',
  progress: 'Progress',
  settings: 'Settings',
}

export default function App() {
  const stats = useStats()
  const [state, dispatch] = useGame(stats)
  const [screen, setScreen] = useState<Screen>('table')
  const coach = useAiCoach(state, stats)
  const [profiles] = useState(getProfiles)
  const [activeProfile] = useState(getActiveProfile)

  const onProfileChange = (value: string) => {
    if (value === '__new') {
      const name = window.prompt('Name for the new profile?')
      if (name === null) return
      createProfile(name)
    } else {
      if (value === activeProfile.id) return
      switchProfile(value)
    }
    // A full reload re-initializes every subsystem from the new profile's data.
    window.location.reload()
  }

  const setMode = (mode: TrainingMode) => {
    const settings = { ...(state.pendingSettings ?? state.settings), mode }
    dispatch({ type: 'UPDATE_SETTINGS', settings })
    savePersisted({ rules: state.pendingRules ?? state.rules, settings, buyIn: state.totalBuyIn })
  }
  const toggleDrill = () => {
    const current = state.pendingSettings ?? state.settings
    const settings = { ...current, drillMode: !current.drillMode }
    dispatch({ type: 'UPDATE_SETTINGS', settings })
    savePersisted({ rules: state.pendingRules ?? state.rules, settings, buyIn: state.totalBuyIn })
  }
  const mode = (state.pendingSettings ?? state.settings).mode
  const drillOn = (state.pendingSettings ?? state.settings).drillMode
  const net = state.userBankroll - state.totalBuyIn

  return (
    <div className={`app ${screen === 'table' ? 'app--table' : ''}`}>
      <header className="rail-top">
        <h1 className="brand">
          <span className="brand__mark">♠</span> Blackjack Coach
        </h1>

        <select
          className="profile-select"
          value={activeProfile.id}
          onChange={(e) => onProfileChange(e.target.value)}
          aria-label="Player profile"
          title="Player profile — each keeps its own stats, skills, and bankroll"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="__new">+ New profile…</option>
        </select>

        <div className="mode-toggle" role="radiogroup" aria-label="Training mode">
          <button
            role="radio"
            aria-checked={mode === 'basic'}
            className={`mode-toggle__opt ${mode === 'basic' ? 'is-on' : ''}`}
            onClick={() => setMode('basic')}
          >
            Basic strategy
          </button>
          <button
            role="radio"
            aria-checked={mode === 'counting'}
            className={`mode-toggle__opt ${mode === 'counting' ? 'is-on' : ''}`}
            onClick={() => setMode('counting')}
          >
            Card counting
          </button>
        </div>

        <button
          className={`drill-toggle ${drillOn ? 'is-on' : ''}`}
          aria-pressed={drillOn}
          title="Drill mode: deal your trouble spots more often"
          onClick={toggleDrill}
        >
          ◎ Drill {drillOn ? 'on' : 'off'}
        </button>

        <nav className="tabs" aria-label="Screens">
          {(Object.keys(SCREEN_LABELS) as Screen[]).map((s) => (
            <button
              key={s}
              className={`tabs__tab ${screen === s ? 'is-on' : ''}`}
              onClick={() => setScreen(s)}
            >
              {SCREEN_LABELS[s]}
            </button>
          ))}
        </nav>

        <button
          className="rank-chip"
          title="Your player rank — click for the skill breakdown"
          onClick={() => setScreen('skills')}
        >
          {playerRank(stats.stats.skillXp).title}
        </button>

        <div className="bankroll" title="Bankroll (net vs total buy-in)">
          <span className="bankroll__amount">${state.userBankroll}</span>
          <span className={`bankroll__net ${net > 0 ? 'is-win' : net < 0 ? 'is-loss' : ''}`}>
            {net >= 0 ? '+' : '−'}${Math.abs(net)}
          </span>
        </div>
      </header>

      {/* The table view is bounded to the viewport so a long verdict rail
          scrolls itself instead of stretching the felt (see .main--table).
          Every other screen is a document that should scroll normally. */}
      <main className={`main ${screen === 'table' ? 'main--table' : ''}`}>
        {screen === 'table' && (
          <GameScreen state={state} dispatch={dispatch} stats={stats} coach={coach} />
        )}
        {screen === 'skills' && (
          <SkillsScreen stats={stats} mode={mode} system={countSystemOf(state)} />
        )}
        {screen === 'stats' && (
          <StatsScreen stats={stats} bankroll={state.userBankroll} totalBuyIn={state.totalBuyIn} />
        )}
        {screen === 'progress' && (
          <ProgressScreen stats={stats} state={state} dispatch={dispatch} coach={coach} />
        )}
        {screen === 'settings' && <SettingsScreen state={state} dispatch={dispatch} />}
      </main>
    </div>
  )
}
