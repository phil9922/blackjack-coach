import type { PlayerHand } from '../engine/types'
import { evaluateHand, isBlackjack, isBusted } from '../engine/hand'
import { CardView } from './CardView'
import { seatDealDelayMs } from './dealStagger'

const RESULT_LABELS: Record<string, string> = {
  blackjack: 'Blackjack!',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
  surrender: 'Surrendered',
}

export function HandView({
  hand,
  active,
  index = 0,
  count = 1,
  dimmed = false,
  seatIndex = 0,
  totalSeats = 1,
}: {
  hand: PlayerHand
  active: boolean
  /** position within the seat, for labelling split hands */
  index?: number
  /** how many hands the seat is playing */
  count?: number
  /** another hand at this seat is the one in play */
  dimmed?: boolean
  /** this seat's position in the real deal order (see dealStagger) */
  seatIndex?: number
  totalSeats?: number
}) {
  const { total, soft } = evaluateHand(hand.cards)
  const bj = isBlackjack(hand.cards, hand.isSplitHand)
  const busted = isBusted(hand.cards)
  const label = bj ? 'Blackjack' : `${soft ? 'soft ' : ''}${total}`
  // A lone hand needs no box or number of its own — those exist to tell split
  // hands apart, and drawing them around a single hand is just noise.
  const split = count > 1

  return (
    <div
      className={`hand ${split ? 'hand--split' : ''} ${active ? 'hand--active' : ''} ${
        dimmed ? 'hand--dimmed' : ''
      }`}
      aria-label={split ? `Hand ${index + 1} of ${count}` : undefined}
      aria-current={active ? 'true' : undefined}
    >
      {split && (
        <div className="hand__label">
          <span className="hand__index">Hand {index + 1}</span>
          {active && <span className="hand__playing">▸ playing</span>}
        </div>
      )}
      <div className="hand__cards">
        {hand.cards.map((c, i) => (
          <CardView
            key={i}
            card={c}
            // A split hand's cards aren't part of the synchronized initial
            // deal (one came from the pair, one's a live post-split draw),
            // so they deal in immediately rather than queuing behind it.
            dealDelayMs={hand.isSplitHand ? 0 : seatDealDelayMs(i, seatIndex, totalSeats)}
          />
        ))}
      </div>
      <div className="hand__meta">
        <span className={`hand__total ${busted ? 'hand__total--bust' : ''}`}>{label}</span>
        <span className="hand__bet">${hand.bet}</span>
        {hand.doubled && <span className="hand__tag">doubled</span>}
        {hand.surrendered && <span className="hand__tag">surrendered</span>}
        {hand.result && (
          <span className={`hand__result hand__result--${hand.result}`}>
            {RESULT_LABELS[hand.result]}
          </span>
        )}
      </div>
    </div>
  )
}
