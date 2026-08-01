import { useState } from 'react'
import { useStats } from './hooks/useStats'
import { useGame } from './hooks/useGame'
import { GameScreen } from './components/GameScreen'
import { StatsScreen } from './components/StatsScreen'
import { ProgressScreen } from './components/ProgressScreen'
import { SkillsScreen } from './components/SkillsScreen'
import { SettingsScreen } from './components/SettingsScreen'
import type { TrainingMode } from './engine/types'
import { savePersisted } from './stats/storage'
import { playerRank } from './gamify/skills'

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
    <div className="app">
      <header className="rail-top">
        <h1 className="brand">
          <span className="brand__mark">♠</span> Blackjack Trainer
        </h1>

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

      <main className="main">
        {screen === 'table' && <GameScreen state={state} dispatch={dispatch} stats={stats} />}
        {screen === 'skills' && <SkillsScreen stats={stats} mode={mode} />}
        {screen === 'stats' && (
          <StatsScreen stats={stats} bankroll={state.userBankroll} totalBuyIn={state.totalBuyIn} />
        )}
        {screen === 'progress' && <ProgressScreen stats={stats} state={state} dispatch={dispatch} />}
        {screen === 'settings' && <SettingsScreen state={state} dispatch={dispatch} />}
      </main>
    </div>
  )
}
