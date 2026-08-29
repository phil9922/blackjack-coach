import { useContext, useLayoutEffect, useRef } from 'react'
import type { Card } from '../engine/types'
import { ShoeAnchorContext } from './ShoeView'

const DEAL_MS = 320

/**
 * Slides a freshly-dealt card in from the shoe's actual screen position,
 * rather than a fixed drop. Runs once per mount, so a re-render of an
 * existing card (rewind, resize) never re-plays it — only a genuinely new
 * card does. Falls back to the plain CSS deal-in (see .card's own
 * `animation`) when there's no shoe to measure from, e.g. inside a modal.
 */
function useDealFromShoe(
  cardRef: React.RefObject<HTMLDivElement>,
  skip: boolean,
  delayMs: number
) {
  const shoeSlotRef = useContext(ShoeAnchorContext)

  useLayoutEffect(() => {
    const el = cardRef.current
    if (skip || !el) return
    const shoeEl = shoeSlotRef?.current
    if (!shoeEl) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cardRect = el.getBoundingClientRect()
    const shoeRect = shoeEl.getBoundingClientRect()
    const dx = shoeRect.left + shoeRect.width / 2 - (cardRect.left + cardRect.width / 2)
    const dy = shoeRect.top + shoeRect.height / 2 - (cardRect.top + cardRect.height / 2)

    el.style.animation = 'none'
    el.style.transition = 'none'
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`
    el.style.opacity = '0'
    // Force a style flush so the browser commits the "from" state above
    // before we switch on the transition below — otherwise both would land
    // in the same frame and nothing would visibly animate.
    void el.offsetWidth
    // delayMs holds the card at the shoe — invisible, not yet in transit —
    // until its turn in the deal, so a full round deals card by card instead
    // of every seat's cards arriving in one simultaneous burst.
    el.style.transition = `transform ${DEAL_MS}ms cubic-bezier(0.16, 0.85, 0.24, 1) ${delayMs}ms, opacity ${Math.round(DEAL_MS * 0.7)}ms ease-out ${delayMs}ms`
    el.style.transform = 'translate(0, 0) scale(1)'
    el.style.opacity = '1'

    const reset = () => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      el.style.animation = ''
    }
    const t = setTimeout(reset, delayMs + DEAL_MS + 30)
    return () => {
      clearTimeout(t)
      // Undo any in-progress slide immediately. Strict Mode double-invokes
      // this effect (mount, cleanup, mount) in dev — without this, the
      // second pass would measure the card mid-transition instead of at
      // its true rest position, and compute a bogus, near-zero delta.
      reset()
    }
    // Deliberately mount-only: a card that's already on the table shouldn't
    // re-fly from the shoe just because something else re-rendered it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function CardView({
  card,
  hidden,
  flipIn,
  dealDelayMs = 0,
}: {
  card: Card
  hidden?: boolean
  /** play the turn-over animation instead of the deal-in drop */
  flipIn?: boolean
  /** how long this card waits at the shoe before sliding — staggers a round of dealing */
  dealDelayMs?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  // The hole-card reveal is a flip in place, not a new deal — never slide it.
  useDealFromShoe(ref, !!flipIn, dealDelayMs)

  if (hidden) {
    return <div ref={ref} className="card card--back" aria-label="face-down card" />
  }
  const red = card.suit === '♥' || card.suit === '♦'
  return (
    <div
      ref={ref}
      className={`card ${red ? 'card--red' : 'card--black'} ${flipIn ? 'card--flip-in' : ''}`}
      aria-label={`${card.rank}${card.suit}`}
    >
      <span className="card__rank">{card.rank}</span>
      <span className="card__suit">{card.suit}</span>
      <span className="card__pip">{card.suit}</span>
    </div>
  )
}
