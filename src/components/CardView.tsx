import type { Card } from '../engine/types'

export function CardView({
  card,
  hidden,
  flipIn,
}: {
  card: Card
  hidden?: boolean
  /** play the turn-over animation instead of the deal-in drop */
  flipIn?: boolean
}) {
  if (hidden) {
    return <div className="card card--back" aria-label="face-down card" />
  }
  const red = card.suit === '♥' || card.suit === '♦'
  return (
    <div
      className={`card ${red ? 'card--red' : 'card--black'} ${flipIn ? 'card--flip-in' : ''}`}
      aria-label={`${card.rank}${card.suit}`}
    >
      <span className="card__rank">{card.rank}</span>
      <span className="card__suit">{card.suit}</span>
      <span className="card__pip">{card.suit}</span>
    </div>
  )
}
