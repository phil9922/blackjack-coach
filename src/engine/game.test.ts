import { describe, expect, it } from 'vitest'
import type { Card, Rank } from './types'
import { DEFAULT_RULES } from './rules'
import {
  initGame,
  gameReducer,
  userSeat,
  activeSeat,
  DEFAULT_SETTINGS,
  type GameState,
  type Settings,
} from './game'
import type { TableRules } from './rules'

const c = (rank: Rank): Card => ({ rank, suit: '♠' })

/**
 * Build a game whose shoe is stacked so the next deal is fully scripted.
 * Deal order: one card to each seat (AI seats first, user last) twice,
 * then dealer upcard, then hole, then `extra` draws in order.
 */
function stacked(opts: {
  user: [Rank, Rank]
  up: Rank
  hole: Rank
  extra?: Rank[]
  ai?: [Rank, Rank][]
  rules?: Partial<TableRules>
  settings?: Partial<Settings>
  buyIn?: number
}): GameState {
  const rules = { ...DEFAULT_RULES, ...opts.rules }
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    aiSeats: (opts.ai ?? []).map((_, i) => ({ name: `AI${i}`, profileId: 'tourist' as const })),
    ...opts.settings,
  }
  const base = initGame({ rules, settings, buyIn: opts.buyIn ?? 1000, seed: 7 })
  const aiHands = opts.ai ?? []
  const shoe: Card[] = []
  // first card round, then second card round
  for (const ai of aiHands) shoe.push(c(ai[0]))
  shoe.push(c(opts.user[0]))
  for (const ai of aiHands) shoe.push(c(ai[1]))
  shoe.push(c(opts.user[1]))
  shoe.push(c(opts.up), c(opts.hole))
  for (const r of opts.extra ?? []) shoe.push(c(r))
  // pad so cardsRemaining math stays sane
  for (let i = 0; i < 40; i++) shoe.push(c('2'))
  return {
    ...base,
    shoe,
    nextCard: 0,
    cutIndex: shoe.length - 5,
    pendingShuffle: false,
    runningCount: 0,
  }
}

const deal = (s: GameState, amount = 15) =>
  gameReducer(s, { type: 'PLACE_BET_AND_DEAL', amount })
const act = (s: GameState, action: 'hit' | 'stand' | 'double' | 'split' | 'surrender') =>
  gameReducer(s, { type: 'PLAYER_ACTION', action })
const tick = (s: GameState) => gameReducer(s, { type: 'ADVANCE' })

function tickUntil(s: GameState, phase: GameState['phase'], max = 30): GameState {
  for (let i = 0; i < max && s.phase !== phase; i++) s = tick(s)
  return s
}

describe('full round flow', () => {
  it('stand -> dealer plays -> settle: 20 beats dealer 19', () => {
    let s = stacked({ user: ['10', '10'], up: '9', hole: '10' })
    s = deal(s, 50)
    expect(s.phase).toBe('seatTurn')
    expect(activeSeat(s)?.kind).toBe('user')
    s = act(s, 'stand')
    s = tickUntil(s, 'roundOver')
    expect(s.userBankroll).toBe(1050)
    expect(s.roundResults?.[0]).toMatchObject({ result: 'win', net: 50 })
  })

  it('a mistake is graded but the chosen move still plays out', () => {
    // 16 vs 7: book says hit; user stands anyway and gets away with it (dealer 17 < ... no, 17 beats 16)
    let s = stacked({ user: ['10', '6'], up: '7', hole: '10' })
    s = deal(s, 20)
    s = act(s, 'stand')
    expect(s.lastGrade?.wasCorrect).toBe(false)
    expect(s.lastGrade?.correct).toBe('hit')
    expect(s.awaitingAck).toBe(true) // pause-on-mistake default
    s = gameReducer(s, { type: 'ACKNOWLEDGE' })
    s = tickUntil(s, 'roundOver')
    expect(s.roundResults?.[0].result).toBe('lose')
    expect(s.userBankroll).toBe(980)
  })

  it('blackjack pays 3:2 without a dealer draw-out', () => {
    let s = stacked({ user: ['A', 'K'], up: '9', hole: '8', extra: ['5'] })
    s = deal(s, 100)
    expect(s.phase).toBe('dealerTurn') // nothing for the user to decide
    s = tickUntil(s, 'roundOver')
    expect(s.userBankroll).toBe(1150)
    expect(s.dealerCards).toHaveLength(2) // no draw against a lone natural
    expect(s.roundResults?.[0].result).toBe('blackjack')
  })

  it('double: bet doubles, exactly one card, hand resolves', () => {
    let s = stacked({ user: ['6', '5'], up: '6', hole: '10', extra: ['9', '10'] })
    s = deal(s, 30)
    s = act(s, 'double')
    expect(s.lastGrade?.wasCorrect).toBe(true)
    expect(userSeat(s).hands[0]).toMatchObject({ doubled: true, bet: 60 })
    expect(userSeat(s).hands[0].cards).toHaveLength(3)
    s = tickUntil(s, 'roundOver')
    // player 20 vs dealer 16 -> must draw -> 16+10=26 bust
    expect(s.roundResults?.[0]).toMatchObject({ result: 'win', net: 60 })
    expect(s.userBankroll).toBe(1060)
  })

  it('bet outside table limits is rejected', () => {
    const s = stacked({ user: ['10', '10'], up: '9', hole: '10' })
    expect(deal(s, 10).phase).toBe('betting') // below $15 min
    expect(deal(s, 2000).phase).toBe('betting') // above $1000 max
    expect(deal(s, 5000).phase).toBe('betting') // above bankroll
  })
})

describe('splits', () => {
  it('split 8s plays two hands, each drawing its second card', () => {
    let s = stacked({ user: ['8', '8'], up: '6', hole: '10', extra: ['3', '10', '5'] })
    s = deal(s, 25)
    s = act(s, 'split')
    expect(s.lastGrade?.wasCorrect).toBe(true)
    expect(userSeat(s).hands).toHaveLength(2)
    // first hand: 8+3=11 -> double is now correct
    s = act(s, 'double') // 11 + 10 = 21
    // second hand becomes active with its second card (5) -> 13 vs 6 -> stand
    s = act(s, 'stand')
    s = tickUntil(s, 'roundOver')
    expect(s.roundResults).toHaveLength(2)
  })

  it('split aces get exactly one card each and auto-resolve', () => {
    let s = stacked({ user: ['A', 'A'], up: '6', hole: '10', extra: ['9', '7', '2'] })
    s = deal(s, 25)
    s = act(s, 'split')
    // both hands resolved -> straight to dealer
    expect(s.phase).toBe('dealerTurn')
    const hands = userSeat(s).hands
    expect(hands).toHaveLength(2)
    expect(hands[0].cards).toHaveLength(2)
    expect(hands[1].cards).toHaveLength(2)
    expect(hands.every((h) => h.fromSplitAces)).toBe(true)
  })

  it('post-split 21 settles as a win, not blackjack', () => {
    let s = stacked({ user: ['A', 'A'], up: '9', hole: '8', extra: ['K', '7'] })
    s = deal(s, 100)
    s = act(s, 'split') // hand 1: A+K = 21 (not BJ), hand 2: A+7 = 18
    s = tickUntil(s, 'roundOver')
    expect(s.roundResults?.[0]).toMatchObject({ result: 'win', net: 100 })
  })
})

describe('insurance and peek', () => {
  it('dealer ace offers insurance; declining is graded correct in basic mode', () => {
    let s = stacked({ user: ['10', '9'], up: 'A', hole: '9' })
    s = deal(s, 20)
    expect(s.phase).toBe('insurance')
    s = gameReducer(s, { type: 'INSURANCE', take: false })
    expect(s.lastGrade?.category).toBe('insurance')
    expect(s.lastGrade?.wasCorrect).toBe(true)
    expect(s.phase).toBe('seatTurn') // no dealer BJ, play on
  })

  it('dealer blackjack ends the round immediately; insurance pays 2:1', () => {
    let s = stacked({ user: ['10', '9'], up: 'A', hole: 'K' })
    s = deal(s, 20)
    s = gameReducer(s, { type: 'INSURANCE', take: true }) // insurance = 10
    expect(s.phase).toBe('roundOver')
    // hand loses 20, insurance wins 20 -> net 0
    expect(s.userBankroll).toBe(1000)
    expect(s.insuranceNet).toBe(20)
    expect(s.roundResults?.[0].result).toBe('lose')
  })

  it('ten-up peek short-circuits into settlement on dealer blackjack', () => {
    let s = stacked({ user: ['10', '9'], up: 'K', hole: 'A' })
    s = deal(s, 20)
    expect(s.phase).toBe('roundOver')
    expect(s.userBankroll).toBe(980)
  })

  it('player blackjack pushes a dealer blackjack', () => {
    let s = stacked({ user: ['A', 'Q'], up: 'K', hole: 'A' })
    s = deal(s, 20)
    expect(s.phase).toBe('roundOver')
    expect(s.userBankroll).toBe(1000)
    expect(s.roundResults?.[0].result).toBe('push')
  })
})

describe('surrender', () => {
  const rules = { surrenderAllowed: true }

  it('surrender forfeits half and skips to settlement', () => {
    let s = stacked({ user: ['10', '6'], up: '10', hole: '9', rules })
    s = deal(s, 40)
    s = act(s, 'surrender')
    expect(s.lastGrade?.wasCorrect).toBe(true) // 16 vs 10 = surrender under H17
    s = tickUntil(s, 'roundOver')
    expect(s.roundResults?.[0]).toMatchObject({ result: 'surrender', net: -20 })
    expect(s.userBankroll).toBe(980)
  })

  it('surrender is rejected when the rule is off', () => {
    let s = stacked({ user: ['10', '6'], up: '10', hole: '9' })
    s = deal(s, 40)
    const after = act(s, 'surrender')
    expect(after).toBe(s) // illegal action ignored
  })
})

describe('counting and the shoe', () => {
  it('tracks visible cards only, revealing the hole at dealer turn', () => {
    // user 10 (-1) + 6 (+1), up 9 (0) = 0; hole 5 hidden and NOT counted
    let s = stacked({ user: ['10', '6'], up: '9', hole: '5', extra: ['4'] })
    s = deal(s, 15)
    expect(s.runningCount).toBe(0)
    s = act(s, 'hit') // draws 4 (+1) -> 20
    expect(s.runningCount).toBe(1)
    s = act(s, 'stand')
    s = tickUntil(s, 'roundOver')
    // hole 5 (+1) revealed; dealer 14 draws padded 2s to 16, 18 (+1 each)
    expect(s.runningCount).toBe(4)
  })

  it('passing the cut card schedules a shuffle that resets the count', () => {
    let s = stacked({ user: ['10', '10'], up: '9', hole: '10' })
    s = { ...s, cutIndex: 1 } // cut card passes during this deal
    s = deal(s, 15)
    s = act(s, 'stand')
    s = tickUntil(s, 'roundOver')
    expect(s.pendingShuffle).toBe(true)
    expect(s.runningCount).not.toBe(0)
    s = gameReducer(s, { type: 'NEXT_ROUND' })
    s = deal(s, 15)
    expect(s.justShuffled).toBe(true)
    // fresh shoe: only the fresh deal's cards are counted
    expect(s.nextCard).toBe(4)
  })
})

describe('AI seats', () => {
  it('AI turns play out on ticks before the user acts, and their cards count', () => {
    let s = stacked({
      user: ['10', '9'],
      ai: [['5', '6']], // tourist with 11: mimics dealer -> hits
      up: '8',
      hole: '9',
      extra: ['9', '10'], // AI hits 11 -> 20 (stands); dealer has 17
    })
    s = deal(s, 15)
    expect(s.phase).toBe('seatTurn')
    expect(activeSeat(s)?.kind).toBe('ai')
    s = tickUntil(s, 'seatTurn', 1) // no-op helper; step AI explicitly:
    while (activeSeat(s)?.kind === 'ai') s = tick(s)
    expect(activeSeat(s)?.kind).toBe('user')
    const ai = s.seats[0]
    expect(ai.hands[0].cards).toHaveLength(3) // hit once to 20
    // count: AI 5+6 (+2), user 10 (-1), 9 (0), up 8 (0), AI's drawn 9 (0) = +1
    expect(s.runningCount).toBe(1)
    s = act(s, 'stand')
    s = tickUntil(s, 'roundOver')
    expect(s.roundResults).toHaveLength(2)
    expect(s.roundResults?.find((r) => !r.isUser)?.result).toBe('win') // AI 20 vs 17
  })
})

describe('rebuy and settings deferral', () => {
  it('rebuy adds to bankroll and tracked buy-in', () => {
    let s = stacked({ user: ['10', '10'], up: '9', hole: '10' })
    s = gameReducer(s, { type: 'REBUY', amount: 500 })
    expect(s.userBankroll).toBe(1500)
    expect(s.totalBuyIn).toBe(1500)
  })

  it('mid-round rule changes wait for the next round', () => {
    let s = stacked({ user: ['10', '6'], up: '7', hole: '10' })
    s = deal(s, 15)
    const newRules = { ...s.rules, surrenderAllowed: true }
    s = gameReducer(s, { type: 'UPDATE_RULES', rules: newRules })
    expect(s.rules.surrenderAllowed).toBe(false) // not yet
    s = act(s, 'hit') // 16 + padded 2 = 18
    s = act(s, 'stand')
    s = tickUntil(s, 'roundOver')
    s = gameReducer(s, { type: 'NEXT_ROUND' })
    expect(s.rules.surrenderAllowed).toBe(true)
  })
})
