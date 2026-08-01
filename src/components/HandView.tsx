import type { PlayerHand } from '../engine/types'
import { evaluateHand, isBlackjack, isBusted } from '../engine/hand'
import { CardView } from './CardView'

const RESULT_LABELS: Record<string, string> = {
  blackjack: 'Blackjack!',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
  surrender: 'Surrendered',
}

export function HandView({ hand, active }: { hand: PlayerHand; active: boolean }) {
  const { total, soft } = evaluateHand(hand.cards)
  const bj = isBlackjack(hand.cards, hand.isSplitHand)
  const busted = isBusted(hand.cards)
  const label = bj ? 'Blackjack' : `${soft ? 'soft ' : ''}${total}`

  return (
    <div className={`hand ${active ? 'hand--active' : ''}`}>
      <div className="hand__cards">
        {hand.cards.map((c, i) => (
          <CardView key={i} card={c} />
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
