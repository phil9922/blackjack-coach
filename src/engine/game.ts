import type { Card, HandResult, PlayerHand, Rank, TrainingMode } from './types'
import { makeHand } from './types'
import type { TableRules } from './rules'
import { DEFAULT_RULES, DEFAULT_BUY_IN } from './rules'
import { buildShoe, shuffle, normalizeRank } from './cards'
import { evaluateHand, isBlackjack, isBusted, isHandResolved, isPairHand, pairRank } from './hand'
import { dealerShouldHit } from './dealer'
import { settleHand } from './payouts'
import { rngNext, rngInt } from './rng'
import { hiLoValue } from '../counting/hilo'
import { trueCount } from '../counting/trueCount'
import type { Availability, GradedDecision, Action } from '../strategy/types'
import { gradeDecision, gradeInsurance } from '../strategy/grade'
import type { AiProfileId } from '../players/profiles'
import { AI_PROFILES } from '../players/profiles'
import { decideAiAction, decideAiBet, decideAiInsurance } from '../players/aiPlayer'
import type { DrillPlan, DrillSpot } from '../drill/planner'

export type Phase =
  | 'betting'
  | 'insurance'
  | 'seatTurn'
  | 'dealerTurn'
  | 'roundOver'
  | 'countQuiz'

export interface AiSeatConfig {
  name: string
  profileId: AiProfileId
}

export interface Settings {
  mode: TrainingMode
  pauseOnMistake: boolean
  showCount: boolean
  quizFrequency: 'off' | 'normal' | 'high'
  aiSeats: AiSeatConfig[]
  /** drill mode: deal the user's trouble spots more often */
  drillMode: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'basic',
  pauseOnMistake: true,
  showCount: true,
  quizFrequency: 'normal',
  aiSeats: [],
  drillMode: false,
}

export interface Seat {
  id: string
  name: string
  kind: 'user' | 'ai'
  profileId?: AiProfileId
  hands: PlayerHand[]
  /** null = not yet decided; 0 = declined; >0 = insurance bet riding */
  insurance: number | null
}

export interface SettledHandRecord {
  seatId: string
  seatName: string
  isUser: boolean
  startingCards: Card[]
  finalCards: Card[]
  bet: number
  result: HandResult
  net: number
  dealerUp: Rank
  dealerFinalTotal: number
  wasSplitHand: boolean
}

export interface QuizResult {
  actualRunning: number
  actualTrueExact: number
  answerRunning: number
  answerTrue: number
  runningCorrect: boolean
  trueCorrect: boolean
}

export interface GameState {
  phase: Phase
  rules: TableRules
  settings: Settings
  rngState: number
  shoe: Card[]
  nextCard: number
  cutIndex: number
  pendingShuffle: boolean
  justShuffled: boolean
  dealerCards: Card[]
  holeRevealed: boolean
  seats: Seat[]
  activeSeatIndex: number
  activeHandIndex: number
  userBankroll: number
  totalBuyIn: number
  userBet: number
  runningCount: number
  lastGrade: GradedDecision | null
  /** monotonically increasing id so effects can record each grade exactly once */
  gradeSeq: number
  awaitingAck: boolean
  hintUsed: boolean
  roundResults: SettledHandRecord[] | null
  /** user's insurance net this round (already applied to bankroll) */
  insuranceNet: number
  lastQuiz: QuizResult | null
  handsSinceQuiz: number
  handsPlayed: number
  /** label of the drill spot this round was stacked toward, if any */
  drilledLabel: string | null
  /**
   * Cards a counting drill sent to the discard tray to reach its target count.
   * They really left the shoe (and were counted), so the count stays honest —
   * this is the "you sat down mid-shoe" situation, shown face-up so it can be
   * counted like any other player's cards.
   */
  burnedCards: Card[]
  /** pending rule/settings edits that apply at the next betting phase */
  pendingRules: TableRules | null
  pendingSettings: Settings | null
}

export type GameAction =
  | { type: 'PLACE_BET_AND_DEAL'; amount: number; drill?: DrillPlan }
  | { type: 'INSURANCE'; take: boolean }
  | { type: 'PLAYER_ACTION'; action: Action }
  | { type: 'USE_HINT' }
  | { type: 'ACKNOWLEDGE' }
  | { type: 'ADVANCE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'QUIZ_SUBMIT'; running: number; trueCountAnswer: number }
  | { type: 'REBUY'; amount: number }
  | { type: 'UPDATE_SETTINGS'; settings: Settings }
  | { type: 'UPDATE_RULES'; rules: TableRules }

// ---------------------------------------------------------------------------

export function initGame(opts?: {
  rules?: TableRules
  settings?: Settings
  buyIn?: number
  seed?: number
}): GameState {
  const rules = opts?.rules ?? DEFAULT_RULES
  const settings = opts?.settings ?? DEFAULT_SETTINGS
  const buyIn = opts?.buyIn ?? DEFAULT_BUY_IN
  const seed = opts?.seed ?? ((Math.random() * 2 ** 31) | 0)
  const base: GameState = {
    phase: 'betting',
    rules,
    settings,
    rngState: seed,
    shoe: [],
    nextCard: 0,
    cutIndex: 0,
    pendingShuffle: true,
    justShuffled: false,
    dealerCards: [],
    holeRevealed: false,
    seats: buildSeats(settings),
    activeSeatIndex: 0,
    activeHandIndex: 0,
    userBankroll: buyIn,
    totalBuyIn: buyIn,
    userBet: rules.tableMin,
    runningCount: 0,
    lastGrade: null,
    gradeSeq: 0,
    awaitingAck: false,
    hintUsed: false,
    roundResults: null,
    insuranceNet: 0,
    lastQuiz: null,
    handsSinceQuiz: 0,
    handsPlayed: 0,
    drilledLabel: null,
    burnedCards: [],
    pendingRules: null,
    pendingSettings: null,
  }
  return reshuffle(base)
}

function buildSeats(settings: Settings): Seat[] {
  const seats: Seat[] = settings.aiSeats.map((ai, i) => ({
    id: `ai-${i}`,
    name: ai.name,
    kind: 'ai',
    profileId: ai.profileId,
    hands: [],
    insurance: null,
  }))
  // User sits last (third base): every AI card is visible before the user acts.
  seats.push({ id: 'user', name: 'You', kind: 'user', hands: [], insurance: null })
  return seats
}

function reshuffle(state: GameState): GameState {
  const fresh = buildShoe(state.rules.decks)
  const { cards, state: rngState } = shuffle(fresh, state.rngState)
  const jitter = rngInt(rngState, 27) // +/- half a deck around the penetration point
  const cut = Math.floor(cards.length * state.rules.penetration) - 13 + jitter.value
  return {
    ...state,
    shoe: cards,
    nextCard: 0,
    cutIndex: cut,
    rngState: jitter.state,
    pendingShuffle: false,
    justShuffled: true,
    runningCount: 0,
  }
}

/** Draw one card. Face-up cards adjust the running count immediately. */
function draw(state: GameState, faceUp: boolean): { card: Card; state: GameState } {
  const card = state.shoe[state.nextCard]
  return {
    card,
    state: {
      ...state,
      nextCard: state.nextCard + 1,
      runningCount: faceUp ? state.runningCount + hiLoValue(card.rank) : state.runningCount,
    },
  }
}

/**
 * Drill-mode draw: pull the next card OF A GIVEN RANK by swapping it forward
 * in the shoe (a rigged shuffle, not a conjured card — the shoe's composition
 * and therefore the count stay honest). Falls back to a natural draw when the
 * rank is exhausted. Ten-value ranks match any face card.
 */
function drawRank(state: GameState, rank: Rank): { card: Card; state: GameState } {
  const want = normalizeRank(rank)
  let found = -1
  for (let i = state.nextCard; i < state.shoe.length; i++) {
    if (normalizeRank(state.shoe[i].rank) === want) {
      found = i
      break
    }
  }
  if (found === -1) return draw(state, true)
  const shoe = state.shoe.slice()
  ;[shoe[state.nextCard], shoe[found]] = [shoe[found], shoe[state.nextCard]]
  return draw({ ...state, shoe }, true)
}

/**
 * Move the shoe toward a target true count by discarding cards that push the
 * count that way (low cards to raise it, tens/aces to lower it). The cards are
 * genuinely removed and counted, so composition and count stay consistent —
 * no faked counts. Stops early if the shoe runs low on the needed rank or the
 * cut card gets close; grading always uses the count actually reached.
 */
function burnToTrueCount(
  state: GameState,
  target: number,
  /** count/shoe effect of the cards this round is about to deal */
  projection: { rc: number; remaining: number }
): GameState {
  let s = state
  const burned: Card[] = []
  // Aim at the count as it will read when the player acts, not right now.
  const projectedTc = (st: GameState) =>
    trueCount(st.runningCount + projection.rc, st.shoe.length - st.nextCard + projection.remaining)

  const startTc = projectedTc(s)
  if (startTc === target) return { ...s, burnedCards: [] }
  const needHigher = startTc < target
  const MAX_BURN = 140

  for (let i = 0; i < MAX_BURN; i++) {
    const tc = projectedTc(s)
    if (needHigher ? tc >= target : tc <= target) break
    // leave room for the round itself plus a margin before the cut card
    if (s.nextCard >= s.cutIndex - 25) break

    let found = -1
    for (let j = s.nextCard; j < s.shoe.length; j++) {
      const v = hiLoValue(s.shoe[j].rank)
      if (needHigher ? v > 0 : v < 0) {
        found = j
        break
      }
    }
    if (found === -1) break

    const shoe = s.shoe.slice()
    ;[shoe[s.nextCard], shoe[found]] = [shoe[found], shoe[s.nextCard]]
    const d = draw({ ...s, shoe }, true)
    s = d.state
    burned.push(d.card)
  }
  return { ...s, burnedCards: burned }
}

function pickDrillSpot(state: GameState, drill: DrillPlan): { spot: DrillSpot | null; state: GameState } {
  const total = drill.spots.reduce((s, x) => s + x.weight, 0)
  if (total <= 0) return { spot: null, state }
  const roll = rngNext(state.rngState)
  let target = roll.value * total
  for (const spot of drill.spots) {
    target -= spot.weight
    if (target <= 0) {
      return { spot: spot.playerRanks ? spot : null, state: { ...state, rngState: roll.state } }
    }
  }
  return { spot: null, state: { ...state, rngState: roll.state } }
}

export function cardsRemaining(state: GameState): number {
  // Count-relevant remaining: undealt cards plus the unseen hole card.
  const holePenalty = state.dealerCards.length >= 2 && !state.holeRevealed ? 1 : 0
  return state.shoe.length - state.nextCard + holePenalty
}

export function currentTrueCount(state: GameState): number {
  return trueCount(state.runningCount, cardsRemaining(state))
}

export function userSeat(state: GameState): Seat {
  return state.seats[state.seats.length - 1]
}

export function activeSeat(state: GameState): Seat | null {
  return state.phase === 'seatTurn' ? state.seats[state.activeSeatIndex] : null
}

export function activeHand(state: GameState): PlayerHand | null {
  const seat = activeSeat(state)
  return seat ? (seat.hands[state.activeHandIndex] ?? null) : null
}

/** Total the user has committed this round (bets + insurance already applied separately). */
function userCommitted(state: GameState): number {
  return userSeat(state).hands.reduce((sum, h) => sum + h.bet, 0)
}

export function availabilityFor(state: GameState, seat: Seat, hand: PlayerHand): Availability {
  const twoCards = hand.cards.length === 2
  const budget =
    seat.kind === 'user' ? state.userBankroll - userCommitted(state) - (seat.insurance ?? 0) : Infinity
  const canDouble =
    twoCards &&
    !hand.fromSplitAces &&
    (!hand.isSplitHand || state.rules.doubleAfterSplit) &&
    budget >= hand.bet
  const canSplit =
    isPairHand(hand.cards) &&
    seat.hands.length < state.rules.maxSplitHands &&
    !(hand.isSplitHand && pairRank(hand.cards) === 'A' && !state.rules.resplitAces) &&
    !hand.fromSplitAces &&
    budget >= hand.bet
  const canSurrender = state.rules.surrenderAllowed && twoCards && !hand.isSplitHand
  return { canDouble, canSplit, canSurrender }
}

// ---------------------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_BET_AND_DEAL':
      return state.phase === 'betting' ? deal(state, action.amount, action.drill) : state
    case 'INSURANCE':
      return state.phase === 'insurance' ? applyUserInsurance(state, action.take) : state
    case 'PLAYER_ACTION':
      return isUsersTurn(state) && !state.awaitingAck
        ? applyUserAction(state, action.action)
        : state
    case 'USE_HINT':
      return { ...state, hintUsed: true }
    case 'ACKNOWLEDGE':
      return { ...state, awaitingAck: false }
    case 'ADVANCE':
      return advance(state)
    case 'NEXT_ROUND':
      return state.phase === 'roundOver' ? toNextRound(state) : state
    case 'QUIZ_SUBMIT':
      return state.phase === 'countQuiz'
        ? submitQuiz(state, action.running, action.trueCountAnswer)
        : state
    case 'REBUY':
      return {
        ...state,
        userBankroll: state.userBankroll + action.amount,
        totalBuyIn: state.totalBuyIn + action.amount,
      }
    case 'UPDATE_SETTINGS':
      return state.phase === 'betting'
        ? applySettings({ ...state, pendingSettings: null }, action.settings)
        : { ...state, pendingSettings: action.settings }
    case 'UPDATE_RULES':
      return state.phase === 'betting'
        ? { ...state, rules: action.rules, pendingShuffle: true }
        : { ...state, pendingRules: action.rules }
  }
}

function isUsersTurn(state: GameState): boolean {
  const seat = activeSeat(state)
  return seat?.kind === 'user'
}

function applySettings(state: GameState, settings: Settings): GameState {
  const seatsChanged =
    JSON.stringify(settings.aiSeats) !== JSON.stringify(state.settings.aiSeats)
  return {
    ...state,
    settings,
    seats: seatsChanged ? buildSeats(settings) : state.seats,
  }
}

// --- dealing ---------------------------------------------------------------

function deal(state: GameState, amount: number, drill?: DrillPlan): GameState {
  const bet = Math.round(amount)
  if (bet < state.rules.tableMin || bet > state.rules.tableMax || bet > state.userBankroll) {
    return state
  }

  let s: GameState = {
    ...state,
    userBet: bet,
    justShuffled: false,
    lastGrade: null,
    awaitingAck: false,
    hintUsed: false,
    roundResults: null,
    insuranceNet: 0,
    lastQuiz: null,
    drilledLabel: null,
    burnedCards: [],
  }
  if (s.pendingShuffle) s = reshuffle(s)

  let drillSpot: DrillSpot | null = null
  if (s.settings.drillMode && drill && drill.spots.length > 0) {
    const picked = pickDrillSpot(s, drill)
    s = picked.state
    drillSpot = picked.spot
    if (drillSpot) {
      s = { ...s, drilledLabel: drillSpot.label }
      if (drillSpot.targetTrueCount !== undefined && drillSpot.playerRanks && drillSpot.dealerUp) {
        // The player's two cards and the dealer upcard are known, so their
        // effect on the count is predictable; AI cards are not (they average
        // out). The hole card stays uncounted, but does leave the shoe.
        const known =
          hiLoValue(drillSpot.playerRanks[0]) +
          hiLoValue(drillSpot.playerRanks[1]) +
          hiLoValue(drillSpot.dealerUp)
        const cardsOut = 2 * s.seats.length + 2
        s = burnToTrueCount(s, drillSpot.targetTrueCount, {
          rc: known,
          remaining: -cardsOut + 1,
        })
      }
    }
  }

  // AI bets + fresh hands
  const seats = s.seats.map((seat) => ({ ...seat, hands: [] as PlayerHand[], insurance: null }))
  for (const seat of seats) {
    if (seat.kind === 'ai') {
      const profile = AI_PROFILES[seat.profileId!]
      const r = decideAiBet(profile, s.rules.tableMin, s.rules.tableMax, s.rngState)
      s = { ...s, rngState: r.state }
      seat.hands = [makeHand([], r.bet)]
    } else {
      seat.hands = [makeHand([], bet)]
    }
  }

  // Two rounds of cards to each seat, then dealer up + hole. In drill mode the
  // user's two cards and the dealer upcard come from the picked trouble spot.
  for (let round = 0; round < 2; round++) {
    for (const seat of seats) {
      const d =
        seat.kind === 'user' && drillSpot?.playerRanks
          ? drawRank(s, drillSpot.playerRanks[round])
          : draw(s, true)
      s = d.state
      seat.hands[0] = { ...seat.hands[0], cards: [...seat.hands[0].cards, d.card] }
    }
  }
  const up = drillSpot?.dealerUp ? drawRank(s, drillSpot.dealerUp) : draw(s, true)
  s = up.state
  const hole = draw(s, false) // face down: not counted until revealed
  s = hole.state

  s = {
    ...s,
    seats,
    dealerCards: [up.card, hole.card],
    holeRevealed: false,
    activeSeatIndex: 0,
    activeHandIndex: 0,
  }

  const upRank = normalizeRank(up.card.rank)
  if (upRank === 'A') {
    // Offer insurance: AI seats decide instantly, user gets the prompt.
    const decided = s.seats.map((seat) => {
      if (seat.kind !== 'ai') return seat
      const profile = AI_PROFILES[seat.profileId!]
      const r = decideAiInsurance(profile, s.rngState)
      s = { ...s, rngState: r.state }
      return { ...seat, insurance: r.take ? seat.hands[0].bet / 2 : 0 }
    })
    return { ...s, seats: decided, phase: 'insurance' }
  }
  if (upRank === '10' && s.rules.dealerPeeks) {
    return resolvePeek(s)
  }
  return startSeatTurns(s)
}

/** A natural against a dealer ace turns the insurance offer into "even money". */
export function isEvenMoneyOffer(state: GameState): boolean {
  const hand = userSeat(state).hands[0]
  return (
    state.phase === 'insurance' && !!hand && isBlackjack(hand.cards, hand.isSplitHand)
  )
}

function applyUserInsurance(state: GameState, take: boolean): GameState {
  const grade = {
    ...gradeInsurance(
      take,
      state.settings.mode,
      currentTrueCount(state),
      isEvenMoneyOffer(state)
    ),
    drilled: state.drilledLabel !== null,
  }
  const seats = state.seats.map((seat) =>
    seat.kind === 'user' ? { ...seat, insurance: take ? seat.hands[0].bet / 2 : 0 } : seat
  )
  const s: GameState = {
    ...state,
    seats,
    lastGrade: grade,
    gradeSeq: state.gradeSeq + 1,
    awaitingAck: state.settings.pauseOnMistake && !grade.wasCorrect,
  }
  return resolvePeek(s)
}

/** Dealer checks for blackjack under ace or ten. */
function resolvePeek(state: GameState): GameState {
  if (!state.rules.dealerPeeks) return startSeatTurns(state)
  const dealerBJ = isBlackjack(state.dealerCards, false)

  // Settle insurance bets now that the peek happened.
  let insuranceNet = 0
  const user = userSeat(state)
  if (user.insurance && user.insurance > 0) {
    insuranceNet = dealerBJ ? user.insurance * 2 : -user.insurance
  }
  let s: GameState = {
    ...state,
    insuranceNet,
    userBankroll: state.userBankroll + insuranceNet,
  }

  if (dealerBJ) {
    // Reveal the hole (it now counts) and settle everything immediately.
    s = revealHole(s)
    return settleRound(s)
  }
  return startSeatTurns(s)
}

function revealHole(state: GameState): GameState {
  if (state.holeRevealed) return state
  return {
    ...state,
    holeRevealed: true,
    runningCount: state.runningCount + hiLoValue(state.dealerCards[1].rank),
  }
}

function startSeatTurns(state: GameState): GameState {
  const s: GameState = { ...state, phase: 'seatTurn', activeSeatIndex: 0, activeHandIndex: 0 }
  return normalizeTurn(s)
}

/**
 * Move the (seat, hand) cursor past resolved hands, dealing the second card
 * to freshly split hands as they come up. Ends in dealerTurn when done.
 */
function normalizeTurn(state: GameState): GameState {
  let s = state
  while (s.activeSeatIndex < s.seats.length) {
    const seat = s.seats[s.activeSeatIndex]
    if (s.activeHandIndex >= seat.hands.length) {
      s = { ...s, activeSeatIndex: s.activeSeatIndex + 1, activeHandIndex: 0 }
      continue
    }
    let hand = seat.hands[s.activeHandIndex]
    if (hand.cards.length === 1) {
      // second card for a split hand
      const d = draw(s, true)
      s = d.state
      hand = { ...hand, cards: [...hand.cards, d.card] }
      s = replaceHand(s, s.activeSeatIndex, s.activeHandIndex, hand)
    }
    if (isHandResolved(hand)) {
      s = { ...s, activeHandIndex: s.activeHandIndex + 1 }
      continue
    }
    return s // an unresolved hand is up
  }
  return beginDealerTurn(s)
}

function replaceHand(state: GameState, seatIdx: number, handIdx: number, hand: PlayerHand): GameState {
  const seats = state.seats.map((seat, i) =>
    i === seatIdx
      ? { ...seat, hands: seat.hands.map((h, j) => (j === handIdx ? hand : h)) }
      : seat
  )
  return { ...state, seats }
}

// --- player actions --------------------------------------------------------

function applyUserAction(state: GameState, action: Action): GameState {
  const seat = activeSeat(state)
  const hand = activeHand(state)
  if (!seat || !hand || seat.kind !== 'user') return state

  const av = availabilityFor(state, seat, hand)
  const legal =
    (action !== 'double' || av.canDouble) &&
    (action !== 'split' || av.canSplit) &&
    (action !== 'surrender' || av.canSurrender)
  if (!legal) return state

  const grade = {
    ...gradeDecision({
      chosen: action,
      cards: hand.cards,
      dealerUp: normalizeRank(state.dealerCards[0].rank),
      av,
      mode: state.settings.mode,
      trueCount: currentTrueCount(state),
      hinted: state.hintUsed,
    }),
    drilled: state.drilledLabel !== null,
  }

  let s: GameState = {
    ...state,
    lastGrade: grade,
    gradeSeq: state.gradeSeq + 1,
    awaitingAck: state.settings.pauseOnMistake && !grade.wasCorrect,
    hintUsed: false,
  }
  s = applyActionToHand(s, s.activeSeatIndex, s.activeHandIndex, action)
  return normalizeTurn(s)
}

function applyActionToHand(
  state: GameState,
  seatIdx: number,
  handIdx: number,
  action: Action
): GameState {
  let s = state
  const seat = s.seats[seatIdx]
  const hand = seat.hands[handIdx]

  switch (action) {
    case 'hit': {
      const d = draw(s, true)
      s = d.state
      return replaceHand(s, seatIdx, handIdx, { ...hand, cards: [...hand.cards, d.card] })
    }
    case 'stand':
      return replaceHand(s, seatIdx, handIdx, { ...hand, stood: true })
    case 'double': {
      const d = draw(s, true)
      s = d.state
      return replaceHand(s, seatIdx, handIdx, {
        ...hand,
        cards: [...hand.cards, d.card],
        bet: hand.bet * 2,
        doubled: true,
      })
    }
    case 'surrender':
      return replaceHand(s, seatIdx, handIdx, { ...hand, surrendered: true })
    case 'split': {
      const aces = pairRank(hand.cards) === 'A'
      const first: PlayerHand = makeHand([hand.cards[0]], hand.bet, {
        isSplitHand: true,
        fromSplitAces: aces,
      })
      const second: PlayerHand = makeHand([hand.cards[1]], hand.bet, {
        isSplitHand: true,
        fromSplitAces: aces,
      })
      const seats = s.seats.map((st, i) =>
        i === seatIdx
          ? {
              ...st,
              hands: [
                ...st.hands.slice(0, handIdx),
                first,
                second,
                ...st.hands.slice(handIdx + 1),
              ],
            }
          : st
      )
      s = { ...s, seats }
      // active hand gets its second card immediately
      const d = draw(s, true)
      s = d.state
      return replaceHand(s, seatIdx, handIdx, {
        ...first,
        cards: [...first.cards, d.card],
      })
    }
  }
}

// --- advancing (AI turns, dealer draws) ------------------------------------

function advance(state: GameState): GameState {
  if (state.awaitingAck) return state
  if (state.phase === 'seatTurn') {
    const seat = activeSeat(state)
    if (!seat) return state
    if (seat.kind === 'user') return normalizeTurn(state) // no-op unless hand resolved
    return aiStep(state)
  }
  if (state.phase === 'dealerTurn') return dealerStep(state)
  return state
}

/** One visible AI decision per tick so the table plays out at a watchable pace. */
function aiStep(state: GameState): GameState {
  const seat = activeSeat(state)
  const hand = activeHand(state)
  if (!seat || !hand || seat.kind !== 'ai') return state

  const profile = AI_PROFILES[seat.profileId!]
  const av = availabilityFor(state, seat, hand)
  const decision = decideAiAction(
    profile,
    hand.cards,
    normalizeRank(state.dealerCards[0].rank),
    av,
    state.rngState
  )
  let s: GameState = { ...state, rngState: decision.state }
  s = applyActionToHand(s, s.activeSeatIndex, s.activeHandIndex, decision.action)
  return normalizeTurn(s)
}

function beginDealerTurn(state: GameState): GameState {
  return { ...state, phase: 'dealerTurn' }
}

function dealerStep(state: GameState): GameState {
  if (!state.holeRevealed) return revealHole(state)

  // Naturals are already paid regardless of the dealer's draw-out, so the
  // dealer only plays when a non-blackjack hand is still live.
  const anyLive = state.seats.some((seat) =>
    seat.hands.some(
      (h) => !h.surrendered && !isBusted(h.cards) && !isBlackjack(h.cards, h.isSplitHand)
    )
  )
  if (anyLive && dealerShouldHit(state.dealerCards, state.rules)) {
    const d = draw(state, true)
    return { ...d.state, dealerCards: [...state.dealerCards, d.card] }
  }
  return settleRound(state)
}

// --- settlement ------------------------------------------------------------

function settleRound(state: GameState): GameState {
  let s = revealHole(state)
  const dealerUp = normalizeRank(s.dealerCards[0].rank)
  const dealerFinalTotal = evaluateHand(s.dealerCards).total
  const results: SettledHandRecord[] = []
  let userNet = 0

  for (const seat of s.seats) {
    for (const hand of seat.hands) {
      const settlement = settleHand(hand, s.dealerCards, s.rules)
      if (seat.kind === 'user') userNet += settlement.net
      results.push({
        seatId: seat.id,
        seatName: seat.name,
        isUser: seat.kind === 'user',
        startingCards: hand.cards.slice(0, 2),
        finalCards: hand.cards,
        bet: hand.bet,
        result: settlement.result,
        net: settlement.net,
        dealerUp,
        dealerFinalTotal,
        wasSplitHand: hand.isSplitHand,
      })
    }
  }

  const seats = s.seats.map((seat) => ({
    ...seat,
    hands: seat.hands.map((h) => ({
      ...h,
      result: settleHand(h, s.dealerCards, s.rules).result,
    })),
  }))

  const pastCut = s.nextCard >= s.cutIndex
  return {
    ...s,
    seats,
    phase: 'roundOver',
    userBankroll: s.userBankroll + userNet,
    roundResults: results,
    pendingShuffle: s.pendingShuffle || pastCut,
    handsPlayed: s.handsPlayed + 1,
    handsSinceQuiz: s.handsSinceQuiz + 1,
  }
}

// --- next round / quiz -----------------------------------------------------

function toNextRound(state: GameState): GameState {
  let s = state
  if (s.pendingRules) {
    s = { ...s, rules: s.pendingRules, pendingRules: null, pendingShuffle: true }
  }
  if (s.pendingSettings) {
    s = applySettings({ ...s, pendingSettings: null }, s.pendingSettings)
  }

  if (s.settings.mode === 'counting' && s.settings.quizFrequency !== 'off') {
    const { chance, guarantee } =
      s.settings.quizFrequency === 'high'
        ? { chance: 0.5, guarantee: 4 }
        : { chance: 0.2, guarantee: 8 }
    const roll = rngNext(s.rngState)
    s = { ...s, rngState: roll.state }
    if (roll.value < chance || s.handsSinceQuiz >= guarantee) {
      return { ...s, phase: 'countQuiz' }
    }
  }
  return { ...s, phase: 'betting' }
}

function submitQuiz(state: GameState, running: number, trueAnswer: number): GameState {
  const actualRunning = state.runningCount
  const remaining = cardsRemaining(state)
  const actualTrueExact = remaining > 0 ? state.runningCount / Math.max(remaining / 52, 0.5) : 0
  const result: QuizResult = {
    actualRunning,
    actualTrueExact,
    answerRunning: running,
    answerTrue: trueAnswer,
    runningCorrect: running === actualRunning,
    trueCorrect: Math.abs(trueAnswer - actualTrueExact) <= 0.5,
  }
  return { ...state, phase: 'betting', lastQuiz: result, handsSinceQuiz: 0 }
}
