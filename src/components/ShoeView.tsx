import { createContext, useEffect, useRef, useState } from 'react'
import type { GameState } from '../engine/game'
import { cardsRemaining } from '../engine/game'

/** Visual layers, not one div per card — the stack's depth is proportional, not literal. */
const MAX_LAYERS = 7

/**
 * Where cards actually come from, for anything that wants to animate a deal
 * from the shoe's real screen position. Null outside the table (e.g. inside a
 * modal), so CardView falls back to its ordinary deal-in when there's nothing
 * to slide from.
 */
export const ShoeAnchorContext = createContext<React.RefObject<HTMLDivElement> | null>(
  null
)

/**
 * The physical shoe, drawn down as the real one honestly is (see cardsRemaining —
 * undealt cards plus the still-unseen hole card). A fresh shuffle shows full again
 * for free: state.shoe/nextCard reset, and this just re-renders from them.
 */
export function ShoeView({
  state,
  slotRef,
}: {
  state: GameState
  /** the shoe's dealing slot — the point every dealt card animates from */
  slotRef: React.RefObject<HTMLDivElement>
}) {
  const total = state.rules.decks * 52
  const remaining = cardsRemaining(state)
  const fraction = total > 0 ? Math.min(Math.max(remaining / total, 0), 1) : 0
  const layers = Math.max(1, Math.round(fraction * MAX_LAYERS))

  const [dealing, setDealing] = useState(false)
  const prevNextCard = useRef(state.nextCard)
  useEffect(() => {
    if (state.nextCard > prevNextCard.current) {
      setDealing(true)
      const t = setTimeout(() => setDealing(false), 220)
      prevNextCard.current = state.nextCard
      return () => clearTimeout(t)
    }
    prevNextCard.current = state.nextCard
  }, [state.nextCard])

  return (
    <div
      className={`shoe ${dealing ? 'is-dealing' : ''}`}
      title={`${remaining} of ${total} cards left in the shoe`}
      aria-label={`Shoe: ${remaining} of ${total} cards left`}
    >
      <div className="shoe__box">
        <div className="shoe__stack" style={{ '--layers': layers } as React.CSSProperties}>
          {Array.from({ length: layers }, (_, i) => (
            <div key={i} className="shoe__card" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>
        {/* The mouth of the shoe — an empty anchor, not a visible card. Every
            dealt card measures its distance from here and slides in from it. */}
        <div className="shoe__slot" ref={slotRef} aria-hidden="true" />
      </div>
      <span className="shoe__count">
        {remaining}
        <span className="shoe__count-total">/{total}</span>
      </span>
    </div>
  )
}
