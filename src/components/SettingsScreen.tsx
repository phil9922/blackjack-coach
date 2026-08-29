import { useState } from 'react'
import type { GameState, GameAction, Settings, AiSeatConfig } from '../engine/game'
import type { TableRules } from '../engine/rules'
import type { StatsState } from '../stats/model'
import { AI_PROFILES, AI_NAMES, type AiProfileId } from '../players/profiles'
import {
  COUNT_SYSTEM_LIST,
  getCountSystem,
  type CountSystemId,
} from '../counting/systems'
import { buildHandLog, handLogToCsv } from '../stats/handLog'
import { DECISION_CAP, OUTCOME_CAP } from '../stats/model'
import {
  savePersisted,
  getProfiles,
  getActiveProfile,
  createProfileWithRules,
  switchProfile,
  renameProfile,
  deleteProfile,
  exportProfile,
  importProfile,
  loadApiKey,
  saveApiKey,
} from '../stats/storage'
import { NewProfileModal } from './NewProfileModal'

function download(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().slice(0, 10)

function downloadProfile(id: string, name: string) {
  const data = exportProfile(id)
  if (!data) return
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[^\w-]+/g, '_')}.bjt-profile.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function SettingsScreen({
  state,
  dispatch,
  stats,
}: {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  stats: StatsState
}) {
  const [rules, setRules] = useState<TableRules>(state.pendingRules ?? state.rules)
  const [settings, setSettings] = useState<Settings>(state.pendingSettings ?? state.settings)
  const [saved, setSaved] = useState(false)
  const [apiKey, setApiKey] = useState(loadApiKey)
  const [keySaved, setKeySaved] = useState(false)
  const [showNewProfile, setShowNewProfile] = useState(false)

  const apply = () => {
    dispatch({ type: 'UPDATE_RULES', rules })
    dispatch({ type: 'UPDATE_SETTINGS', settings })
    savePersisted({ rules, settings, buyIn: state.totalBuyIn })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const log = buildHandLog(stats)
  const hasLog = log.rounds.length > 0

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
          Shoe: {rules.decks} {rules.decks === 1 ? 'deck' : 'decks'} <em>(set when this profile was
          created)</em> · Fixed: dealer hits soft 17 · double after split · blackjack pays 3:2 ·
          resplit to 4 hands · dealer peeks
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

        <label className="settings__row">
          <span>Counting system</span>
          <select
            value={settings.countSystem}
            onChange={(e) =>
              setSettings({ ...settings, countSystem: e.target.value as CountSystemId })
            }
          >
            {COUNT_SYSTEM_LIST.map((sys) => (
              <option key={sys.id} value={sys.id}>
                {sys.name} — {sys.blurb}
              </option>
            ))}
          </select>
        </label>
        <p className="settings__note">{getCountSystem(settings.countSystem).detail}</p>
        {!getCountSystem(settings.countSystem).supportsDeviations && (
          <p className="settings__warn">
            <strong>Deviations are off while {getCountSystem(settings.countSystem).name} is
            selected.</strong>{' '}
            Index numbers belong to the system they were computed for — a Hi-Lo index applied to
            a {getCountSystem(settings.countSystem).name} count is just a wrong play. This app
            only ships a verified Hi-Lo index set, so your plays are graded against basic
            strategy and index drills are hidden. The count, quizzes, speed drill and bet ramp
            all still work.
          </p>
        )}
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
        <label className="settings__row settings__row--check">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
          />
          <span>
            Table sounds <em>(cards, chips, and a chime on each verdict)</em>
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

      <fieldset className="settings__group">
        <legend>AI coach (optional)</legend>
        <p className="settings__fixed">
          With your own Claude API key, the Progress tab can ask Claude for a written read on how
          you play. Everything else in this app runs offline and works without a key.
        </p>
        <label className="settings__row">
          <span>Claude API key</span>
          <input
            type="password"
            placeholder="sk-ant-…"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={() => saveApiKey(apiKey)}
            autoComplete="off"
          />
        </label>
        <label className="settings__row">
          <span>Live coaching</span>
          <select
            value={settings.liveCoach}
            onChange={(e) =>
              setSettings({ ...settings, liveCoach: e.target.value as Settings['liveCoach'] })
            }
          >
            <option value="off">Off — only when I ask</option>
            <option value="normal">On — review every ~15 hands</option>
            <option value="often">Often — review every ~8 hands</option>
          </select>
        </label>
        <p className="settings__fixed">
          When live coaching is on, the coach reviews your record between hands and interrupts only
          when it spots a new pattern worth telling you about. Each review is one API call billed to
          your key, so &ldquo;often&rdquo; costs roughly twice what &ldquo;on&rdquo; does.
        </p>
        <div className="settings__row">
          <button
            className="btn btn--ghost"
            onClick={() => {
              saveApiKey(apiKey)
              setKeySaved(true)
              setTimeout(() => setKeySaved(false), 2000)
            }}
          >
            Save key
          </button>
          {apiKey && (
            <button
              className="btn btn--ghost profile-row__delete"
              onClick={() => {
                setApiKey('')
                saveApiKey('')
              }}
            >
              Remove key
            </button>
          )}
          {keySaved && <span className="settings__saved">Key saved.</span>}
        </div>
        <p className="settings__warning">
          <strong>Know what this means:</strong> the key is stored in this browser and sent straight
          from this page to Anthropic — there's no server in between. Anything that can run script
          in this browser can read it, and usage bills to your account. Use a key scoped to this
          purpose, and remove it here when you're done. It is never included in profile exports.
        </p>
      </fieldset>

      <fieldset className="settings__group">
        <legend>Hand log</legend>
        <p className="settings__fixed">
          Every hand this profile has played, how you played it, and what it cost — one row per
          settled hand, with the round's decisions and whether each matched the book.
        </p>
        <div className="settings__row">
          <button
            className="btn btn--ghost"
            disabled={!hasLog}
            onClick={() =>
              download(`blackjack-hand-log-${stamp()}.csv`, handLogToCsv(log), 'text/csv')
            }
          >
            Export hand log (CSV)
          </button>
          <button
            className="btn btn--ghost"
            disabled={!hasLog}
            onClick={() =>
              download(
                `blackjack-hand-log-${stamp()}.json`,
                JSON.stringify(log, null, 2),
                'application/json'
              )
            }
          >
            Export as JSON
          </button>
          <span className="settings__saved">
            {hasLog
              ? `${log.rounds.length} rounds recorded`
              : 'Play a hand or two first — nothing recorded yet.'}
          </span>
        </div>
        {log.truncated && (
          <p className="settings__warn">
            <strong>This log is the recent past, not all of it.</strong> History is capped at
            {' '}{DECISION_CAP} decisions and {OUTCOME_CAP} hands per profile, and this profile has
            reached that, so its oldest rounds have already been discarded. Export periodically if
            you want to keep the whole run.
          </p>
        )}
      </fieldset>

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
              <button className="btn btn--ghost" onClick={() => downloadProfile(p.id, p.name)}>
                Export
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
        <div className="settings__row">
          <button className="btn btn--ghost" onClick={() => setShowNewProfile(true)}>
            + New profile
          </button>
          <label className="btn btn--ghost import-label">
            Import profile…
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                file.text().then((text) => {
                  try {
                    const profile = importProfile(JSON.parse(text))
                    if (profile) {
                      window.location.reload()
                    } else {
                      window.alert('That file is not a Blackjack Coach profile export.')
                    }
                  } catch {
                    window.alert('Could not read that file as a profile export.')
                  }
                })
              }}
            />
          </label>
        </div>
      </fieldset>

      {/* Pinned to the viewport, not buried between fieldsets: this button
          applies every section on the page, and the page is long enough that
          a static one gets missed or read as applying only what's above it. */}
      <div className="settings__apply">
        <button className="btn btn--primary" onClick={apply}>
          Apply settings
        </button>
        <span className="settings__apply-hint">
          {saved ? 'Saved — applies next hand.' : 'Applies everything on this page.'}
        </span>
      </div>

      {showNewProfile && (
        <NewProfileModal
          onClose={() => setShowNewProfile(false)}
          onCreate={({ name, tableMin, tableMax, decks }) => {
            createProfileWithRules(name, { tableMin, tableMax, decks })
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
