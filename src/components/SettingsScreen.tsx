import { useState } from 'react'
import type { GameState, GameAction, Settings, AiSeatConfig } from '../engine/game'
import type { TableRules } from '../engine/rules'
import { AI_PROFILES, AI_NAMES, type AiProfileId } from '../players/profiles'
import {
  savePersisted,
  getProfiles,
  getActiveProfile,
  createProfile,
  switchProfile,
  renameProfile,
  deleteProfile,
} from '../stats/storage'

export function SettingsScreen({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}) {
  const [rules, setRules] = useState<TableRules>(state.pendingRules ?? state.rules)
  const [settings, setSettings] = useState<Settings>(state.pendingSettings ?? state.settings)
  const [saved, setSaved] = useState(false)

  const apply = () => {
    dispatch({ type: 'UPDATE_RULES', rules })
    dispatch({ type: 'UPDATE_SETTINGS', settings })
    savePersisted({ rules, settings, buyIn: state.totalBuyIn })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const setAiCount = (n: number) => {
    const seats: AiSeatConfig[] = Array.from({ length: n }, (_, i) => ({
      name: settings.aiSeats[i]?.name ?? AI_NAMES[i % AI_NAMES.length],
      profileId: settings.aiSeats[i]?.profileId ?? 'average',
    }))
    setSettings({ ...settings, aiSeats: seats })
  }

  const setProfile = (i: number, profileId: AiProfileId) => {
    setSettings({
      ...settings,
      aiSeats: settings.aiSeats.map((s, j) => (j === i ? { ...s, profileId } : s)),
    })
  }

  return (
    <div className="settings">
      <h2 className="screen-title">Table &amp; training settings</h2>
      <p className="settings__note">
        Changes apply at the next hand. Rule changes trigger a fresh shoe.
      </p>

      <fieldset className="settings__group">
        <legend>Table rules</legend>
        <label className="settings__row">
          <span>Table minimum</span>
          <input
            type="number"
            min={1}
            value={rules.tableMin}
            onChange={(e) => setRules({ ...rules, tableMin: Number(e.target.value) })}
          />
        </label>
        <label className="settings__row">
          <span>Table maximum</span>
          <input
            type="number"
            min={rules.tableMin}
            value={rules.tableMax}
            onChange={(e) => setRules({ ...rules, tableMax: Number(e.target.value) })}
          />
        </label>
        <label className="settings__row settings__row--check">
          <input
            type="checkbox"
            checked={rules.surrenderAllowed}
            onChange={(e) => setRules({ ...rules, surrenderAllowed: e.target.checked })}
          />
          <span>
            Allow late surrender <em>(off at most real tables; turning it on changes correct strategy — e.g. 16 vs 10 becomes a surrender)</em>
          </span>
        </label>
        <p className="settings__fixed">
          Fixed: 6 decks · dealer hits soft 17 · double after split · blackjack pays 3:2 · resplit to
          4 hands · dealer peeks
        </p>
      </fieldset>

      <fieldset className="settings__group">
        <legend>Training</legend>
        <label className="settings__row settings__row--check">
          <input
            type="checkbox"
            checked={settings.pauseOnMistake}
            onChange={(e) => setSettings({ ...settings, pauseOnMistake: e.target.checked })}
          />
          <span>Pause after a mistake until I acknowledge it</span>
        </label>
        <label className="settings__row settings__row--check">
          <input
            type="checkbox"
            checked={settings.showCount}
            onChange={(e) => setSettings({ ...settings, showCount: e.target.checked })}
          />
          <span>Show the running/true count (turn off to test yourself)</span>
        </label>
        <label className="settings__row settings__row--check">
          <input
            type="checkbox"
            checked={settings.drillMode}
            onChange={(e) => setSettings({ ...settings, drillMode: e.target.checked })}
          />
          <span>
            Drill mode <em>(the trainer learns your trouble spots and deals them more often — see the Progress tab for what it's currently targeting)</em>
          </span>
        </label>
        <label className="settings__row">
          <span>Count quiz frequency</span>
          <select
            value={settings.quizFrequency}
            onChange={(e) =>
              setSettings({ ...settings, quizFrequency: e.target.value as Settings['quizFrequency'] })
            }
          >
            <option value="off">Off</option>
            <option value="normal">Normal (~1 in 5 rounds)</option>
            <option value="high">High (~1 in 2 rounds)</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="settings__group">
        <legend>Other players at the table</legend>
        <label className="settings__row">
          <span>Computer players</span>
          <select value={settings.aiSeats.length} onChange={(e) => setAiCount(Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'Just me and the dealer' : `${n} other player${n > 1 ? 's' : ''}`}
              </option>
            ))}
          </select>
        </label>
        {settings.aiSeats.map((seat, i) => (
          <label key={i} className="settings__row">
            <span>{seat.name} plays like</span>
            <select value={seat.profileId} onChange={(e) => setProfile(i, e.target.value as AiProfileId)}>
              {Object.values(AI_PROFILES).map((p) => (
                <option key={p.id} value={p.id} title={p.description}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        {settings.aiSeats.length > 0 && (
          <p className="settings__fixed">
            You sit at third base (last to act) so you see every card before your turn — the best
            seat for count practice. Real players make real mistakes; their play doesn't change your
            odds, but their cards do change the count.
          </p>
        )}
      </fieldset>

      <div className="settings__apply">
        <button className="btn btn--primary" onClick={apply}>
          Apply settings
        </button>
        {saved && <span className="settings__saved">Saved — applies next hand.</span>}
      </div>

      <fieldset className="settings__group">
        <legend>Player profiles</legend>
        <p className="settings__fixed">
          Each profile keeps its own stats, skill progression, badges, settings, and bankroll.
        </p>
        {getProfiles().map((p) => {
          const active = p.id === getActiveProfile().id
          return (
            <div key={p.id} className="settings__row profile-row">
              <span className={active ? 'profile-row__name profile-row__name--active' : 'profile-row__name'}>
                {p.name}
                {active && ' (active)'}
              </span>
              {!active && (
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    switchProfile(p.id)
                    window.location.reload()
                  }}
                >
                  Switch to
                </button>
              )}
              <button
                className="btn btn--ghost"
                onClick={() => {
                  const name = window.prompt('New name?', p.name)
                  if (name !== null) {
                    renameProfile(p.id, name)
                    window.location.reload()
                  }
                }}
              >
                Rename
              </button>
              <button
                className="btn btn--ghost profile-row__delete"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${p.name}" and ALL its history, skills, and badges? This cannot be undone.`
                    )
                  ) {
                    deleteProfile(p.id)
                    window.location.reload()
                  }
                }}
              >
                Delete
              </button>
            </div>
          )
        })}
        <button
          className="btn btn--ghost"
          onClick={() => {
            const name = window.prompt('Name for the new profile?')
            if (name !== null) {
              createProfile(name)
              window.location.reload()
            }
          }}
        >
          + New profile
        </button>
      </fieldset>
    </div>
  )
}
