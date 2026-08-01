export type Suit = '♠' | '♥' | '♦' | '♣'

export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  rank: Rank
  suit: Suit
}

export interface HandValue {
  total: number
  /** true iff an ace is currently counted as 11 */
  soft: boolean
}

export type HandResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'surrender'

export interface PlayerHand {
  cards: Card[]
  bet: number
  isSplitHand: boolean
  fromSplitAces: boolean
  doubled: boolean
  surrendered: boolean
  stood: boolean
  result: HandResult | null
}

export type TrainingMode = 'basic' | 'counting'

export function makeHand(cards: Card[], bet: number, opts?: Partial<PlayerHand>): PlayerHand {
  return {
    cards,
    bet,
    isSplitHand: false,
    fromSplitAces: false,
    doubled: false,
    surrendered: false,
    stood: false,
    result: null,
    ...opts,
  }
}
