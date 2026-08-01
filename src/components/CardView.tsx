import type { Card } from '../engine/types'

export function CardView({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return <div className="card card--back" aria-label="face-down card" />
  }
  const red = card.suit === '♥' || card.suit === '♦'
  return (
    <div className={`card ${red ? 'card--red' : 'card--black'}`} aria-label={`${card.rank}${card.suit}`}>
      <span className="card__rank">{card.rank}</span>
      <span className="card__suit">{card.suit}</span>
      <span className="card__pip">{card.suit}</span>
    </div>
  )
}
