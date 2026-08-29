import { useEffect, useRef, useState } from 'react'
import { DEFAULT_RULES } from '../engine/rules'

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
  onCreate: (input: { name: string; tableMin: number; tableMax: number; decks: number }) => void
}) {
  const [name, setName] = useState('')
  const [tableMin, setTableMin] = useState(String(DEFAULT_RULES.tableMin))
  const [tableMax, setTableMax] = useState(String(DEFAULT_RULES.tableMax))
  const [decks, setDecks] = useState(DEFAULT_RULES.decks)
  const nameBox = useRef<HTMLInputElement>(null)

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
    onCreate({ name: name.trim(), tableMin: min, tableMax: max, decks })
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
