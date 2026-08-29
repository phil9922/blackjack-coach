import type { CountSystem } from '../counting/systems'

/**
 * Shown once, the moment someone switches into counting mode — not buried
 * behind the count chip's own "?" (see CountChip), which a first-time
 * counter has no reason yet to know exists or tap.
 */
export function CountingIntroModal({
  system,
  onClose,
}: {
  system: CountSystem
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Card counting mode">
      <div className="modal">
        <h2 className="modal__title">Card counting mode</h2>
        <p>
          Basic strategy assumes a full, freshly shuffled shoe every hand. Counting tracks which
          cards have already come out, so you can tell when the cards <em>left</em> in the shoe
          favor you — and bet bigger, or occasionally play differently, to take advantage of it.
        </p>
        <p>
          <strong>RC — running count.</strong> A tally kept as cards are dealt: low cards (2–6)
          add to it, high cards (10s and aces) subtract from it — {system.name} adds{' '}
          {system.values['2']} for a 2 and {system.values['10']} for a ten, for example. This app
          keeps it for you, live, in the chip above the table.
        </p>
        {system.balanced ? (
          <p>
            <strong>TC — true count.</strong> The same running count means something different
            with one deck left than with five, so it's divided by the decks remaining to get the
            true count — that's the number that should actually change your bet or your play, not
            the raw running count.
          </p>
        ) : (
          <p>
            <strong>{system.name} skips the true count.</strong> It's built to start the running
            count low and climb, so the running count alone is the signal — no dividing by decks
            needed.
          </p>
        )}
        <p className="modal__note">
          {system.supportsDeviations
            ? `${system.name} carries verified deviations, so the trainer also grades plays that break from basic strategy at extreme counts — not just the basic-strategy chart.`
            : `${system.name} doesn't carry verified deviations yet, so plays are still graded against basic strategy — the count itself is what you're practising reading.`}{' '}
          Tap the count chip on the table any time to see this again.
        </p>
        <button className="btn btn--primary" onClick={onClose}>
          Got it — let's play
        </button>
      </div>
    </div>
  )
}
