export interface TableRules {
  decks: number
  hitSoft17: boolean
  blackjackPayout: number
  doubleAfterSplit: boolean
  maxSplitHands: number
  resplitAces: boolean
  dealerPeeks: boolean
  surrenderAllowed: boolean
  tableMin: number
  tableMax: number
  /** fraction of the shoe dealt before the cut card */
  penetration: number
}

export const DEFAULT_RULES: TableRules = {
  decks: 6,
  hitSoft17: true,
  blackjackPayout: 1.5,
  doubleAfterSplit: true,
  maxSplitHands: 4,
  resplitAces: false,
  dealerPeeks: true,
  surrenderAllowed: false,
  tableMin: 25,
  tableMax: 1000,
  penetration: 0.75,
}

export const DEFAULT_BUY_IN = 500
