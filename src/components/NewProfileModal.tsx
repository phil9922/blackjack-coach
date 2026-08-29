import { useEffect, useRef, useState } from 'react'
import { DEFAULT_RULES } from '../engine/rules'
import type { AiSeatConfig } from '../engine/game'
import { AI_PROFILES, AI_NAMES, type AiProfileId } from '../players/profiles'

/** Realistic Vegas shoe sizes — matches the KO key-count table exactly, no rounding needed. */
const DECK_OPTIONS = [1, 2, 4, 6, 8]

/**
 * Table rules picked once, at profile creation, rather than always inheriting
 * DEFAULT_RULES. Deck count in particular isn't editable later (SettingsScreen
 * lists it under "Fixed"), so this is the only chance to set it.
 */
export function NewProfileModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: {
    name: string
    tableMin: number
    tableMax: number
    decks: number
    surrenderAllowed: boolean
    aiSeats: AiSeatConfig[]
  }) => void
}) {
  const [name, setName] = useState('')
  const [tableMin, setTableMin] = useState(String(DEFAULT_RULES.tableMin))
  const [tableMax, setTableMax] = useState(String(DEFAULT_RULES.tableMax))
  const [decks, setDecks] = useState(DEFAULT_RULES.decks)
  const [surrenderAllowed, setSurrenderAllowed] = useState(DEFAULT_RULES.surrenderAllowed)
  const [aiSeats, setAiSeats] = useState<AiSeatConfig[]>([])
  const nameBox = useRef<HTMLInputElement>(null)

  const setAiCount = (n: number) => {
    setAiSeats(
      Array.from({ length: n }, (_, i) => ({
        name: aiSeats[i]?.name ?? AI_NAMES[i % AI_NAMES.length],
        profileId: aiSeats[i]?.profileId ?? 'average',
      }))
    )
  }

  const setAiProfile = (i: number, profileId: AiProfileId) => {
    setAiSeats(aiSeats.map((s, j) => (j === i ? { ...s, profileId } : s)))
  }

  useEffect(() => {
    nameBox.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const min = Number(tableMin)
  const max = Number(tableMax)
  const valid = name.trim().length > 0 && min >= 1 && max >= min

  const submit = () => {
    if (!valid) return
    onCreate({ name: name.trim(), tableMin: min, tableMax: max, decks, surrenderAllowed, aiSeats })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="New profile">
      <div className="modal">
        <h2 className="modal__title">New profile</h2>
        <p className="modal__note">
          Each profile keeps its own stats, skills, and bankroll — and its own shoe.
        </p>

        <label className="modal__field">
          Name
          <input
            ref={nameBox}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Player name"
          />
        </label>

        <label className="modal__field">
          Table minimum
          <input
            type="number"
            min={1}
            value={tableMin}
            onChange={(e) => setTableMin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        <label className="modal__field">
          Table maximum
          <input
            type="number"
            min={min || 1}
            value={tableMax}
            onChange={(e) => setTableMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        <label className="modal__field">
          Number of decks
          <select value={decks} onChange={(e) => setDecks(Number(e.target.value))}>
            {DECK_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? 'deck' : 'decks'}
                {d === DEFAULT_RULES.decks ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="settings__row settings__row--check">
          <input
            type="checkbox"
            checked={surrenderAllowed}
            onChange={(e) => setSurrenderAllowed(e.target.checked)}
          />
          <span>
            Allow late surrender <em>(off at most real tables; turning it on changes correct
            strategy — e.g. 16 vs 10 becomes a surrender)</em>
          </span>
        </label>

        <label className="modal__field">
          Computer players
          <select value={aiSeats.length} onChange={(e) => setAiCount(Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'Just me and the dealer' : `${n} other player${n > 1 ? 's' : ''}`}
              </option>
            ))}
          </select>
        </label>
        {aiSeats.map((seat, i) => (
          <label key={i} className="modal__field">
            {seat.name} plays like
            <select
              value={seat.profileId}
              onChange={(e) => setAiProfile(i, e.target.value as AiProfileId)}
            >
              {Object.values(AI_PROFILES).map((p) => (
                <option key={p.id} value={p.id} title={p.description}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        {aiSeats.length > 0 && (
          <p className="modal__note">
            You sit at third base (last to act) so you see every card before your turn — the best
            seat for count practice. This is just for the deal; change it any time in Settings.
          </p>
        )}

        <div className="ask__actions">
          <button className="btn btn--primary" onClick={submit} disabled={!valid}>
            Create
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
