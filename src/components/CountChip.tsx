import { useState } from 'react'
import type { GameState } from '../engine/game'
import { currentTrueCount, cardsRemaining, countSystemOf } from '../engine/game'

/**
 * The RC/TC readout — but jargon nobody's told them means nothing to a
 * first-time counter. Tapping it (not just hovering, so it works on
 * touch too) opens a plain-language explanation instead of assuming the
 * abbreviations are self-evident.
 */
export function CountChip({ state }: { state: GameState }) {
  const [explain, setExplain] = useState(false)
  const system = countSystemOf(state)
  const rc = state.runningCount
  const tc = currentTrueCount(state)
  const decksLeft = Math.round((cardsRemaining(state) / 52) * 10) / 10

  return (
    <div className="count-chip-wrap">
      <button
        type="button"
        className="count-chip"
        onClick={() => setExplain((v) => !v)}
        aria-expanded={explain}
      >
        {system.name} · RC {rc >= 0 ? '+' : ''}
        {rc}
        {system.balanced && (
          <>
            {' '}· TC {tc >= 0 ? '+' : ''}
            {tc}
          </>
        )}{' '}
        · {decksLeft} decks left
        <span className="count-chip__q" aria-hidden="true">
          ?
        </span>
      </button>

      {explain && (
        <div className="count-chip__explainer" role="note">
          <p>
            <strong>RC — running count.</strong> A tally you keep as cards come out: low cards
            (2–6) add to it, high cards (10s and aces) subtract from it. {system.name} adds{' '}
            {system.values['2']} for a 2 and {system.values['10']} for a ten, for example. A
            higher count means more high cards are left in the shoe — better for you.
          </p>
          {system.balanced ? (
            <p>
              <strong>TC — true count.</strong> The running count means something different with
              1 deck left than with 5 — so it's divided by the decks remaining ({decksLeft} right
              now) to get the true count. This is the number that should actually change your bet
              or your play, not the raw running count.
            </p>
          ) : (
            <p>
              <strong>{system.name} doesn't use a true count.</strong> It's built to start the
              running count low and climb, so the running count alone is the signal — no dividing
              by decks needed.
            </p>
          )}
          <button className="btn btn--ghost" onClick={() => setExplain(false)}>
            Got it
          </button>
        </div>
      )}
    </div>
  )
}
