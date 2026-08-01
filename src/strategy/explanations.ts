import type { Rank } from '../engine/types'
import { normalizeRank } from '../engine/cards'
import type { Action, CorrectPlay, Explanation, HandKey } from './types'
import { handKeyLabel, handKeyToString } from './types'
import { DEVIATIONS } from './deviations'

export const ACTION_LABELS: Record<Action, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double down',
  split: 'Split',
  surrender: 'Surrender',
}

/**
 * Curated explanations for the interesting and counterintuitive cells,
 * keyed `${handKeyString}|${upcard}`. Everything else falls back to
 * reasoning templates — no cell ever says just "the chart says so".
 */
const CURATED: Record<string, string> = {
  'hard16|10':
    '16 vs 10 is the worst spot in blackjack — every option loses money. Hitting busts about 62% of the time; standing only wins when the dealer breaks (roughly 23% with a ten up). Surrendering gives up exactly half a bet, which beats the ~54 cents per dollar you lose by hitting. When surrender is not available, hitting edges out standing by a hair.',
  'hard16|9':
    'A 16 against a 9 loses more than half the time whatever you do. Surrender caps the damage at half a bet; without it, hit — the dealer makes 17+ too often for standing on 16 to compete, even though the hit busts often.',
  'hard16|A':
    'Against an ace (after the peek has ruled out blackjack) your 16 is in terrible shape — the dealer makes a strong hand very often, and under H17 the soft-17 re-draw makes the ace even stronger. Surrender if you can; otherwise hit, because standing on 16 only wins on a dealer bust.',
  'hard16|7':
    'Treat the dealer\'s 7 as a made 17. Your 16 standing loses to that 17 outright, so you must hit and try to beat it — the bust risk hurts, but standing is a guaranteed loser unless the dealer breaks, which a 7 rarely does.',
  'hard15|10':
    '15 vs 10 loses about 54 cents per dollar played out. Surrender loses exactly 50 — take the cheaper exit. If surrender is off the table, hit: standing only wins on a dealer break.',
  'hard15|A':
    'Under H17 the dealer\'s ace re-draws soft 17, making it even stronger, and that pushes 15 vs A over the surrender line. Give up half a bet rather than play out a hand that loses well more than half. Without surrender, hit.',
  'hard17|A':
    'This surprises people: under H17, hard 17 vs an ace is a surrender. The dealer re-hits soft 17, so the ace makes 18+ so often that your flat 17 loses more than half its value played out. Never hit a hard 17, though — if surrender is unavailable, stand.',
  'hard12|2':
    '12 vs 2 is a classic trap. The 2 is only a mildly weak card — the dealer breaks just ~35% of the time — and only a ten busts your 12 (4 of 13 ranks). Hitting wins more often than hoping for the break. Stand starts at 13 against a 2.',
  'hard12|3':
    '12 vs 3 plays like 12 vs 2: the dealer doesn\'t break often enough, and only a ten busts you. Take the hit; save standing for 12 vs 4-6.',
  'hard12|4':
    'Against a 4 the dealer breaks about 40% of the time — now standing on 12 is right, barely. It\'s a razor-thin cell: you\'re not standing because 12 is good, you\'re standing because busting your own hand before a breaking dealer is worse.',
  'hard13|2':
    'With 13 vs 2 you stand — but know it\'s close. The 2 isn\'t as weak as it looks; this is the thinnest of the "stand on stiffs" cells and one card counters actually flip when the count goes negative.',
  'hard11|A':
    'Under H17, 11 vs ace is a double. Elevens are the best doubling hand in the game — you can\'t bust and a third of the deck makes you 21 — and the H17 rule slightly weakens the dealer\'s strong-ace outcomes, tipping this from "hit" (the S17 play) to "get more money out".',
  'hard11|10':
    'Double 11 against a ten. It feels aggressive into a strong card, but you draw to 21/20 often enough that putting a second bet up wins more over time than the safe hit.',
  'hard10|10':
    'Just hit 10 vs 10. Doubling is for when the dealer is weaker than you — against a ten, the dealer makes 20 too often to double into, but your 10 still plays well with a free hit.',
  'hard9|3':
    'Double 9 vs 3-6: the dealer is in breaking territory and any ten gives you 19. Against 2 or 7+ the edge isn\'t there — that\'s hit only.',
  'hard9|2':
    'Hit, don\'t double, 9 against a 2 — the 2 breaks the dealer too rarely to justify the second bet (basic strategy; card counters do double this once the count turns positive).',
  'hard8|6':
    'Just hit 8, even against the 6. Doubling small totals against a breaking dealer starts at 9 — with 8, too few draws give you a hand strong enough to justify doubling the stake.',
  'soft18|2':
    'Soft 18 vs 2 is a double under H17 (with stand as the fallback). A7 is deceptive: 18 only pushes the average winning hand, and against a 2 the dealer breaks often enough to press money in while your hand can still improve to 19-21 for free.',
  'soft18|9':
    'Standing on soft 18 vs 9 feels safe and is actually a mistake — the dealer makes 19+ too often, so your 18 is a loser standing pat. Hit: the soft hand can\'t bust with one card, and you get a fresh chance at 19-21.',
  'soft18|10':
    'Soft 18 vs 10 is a hit, and it\'s the most-misplayed cell in blackjack. An 18 loses to the dealer\'s average made hand with a ten up; because the ace protects you from busting, hitting is a free attempt to improve.',
  'soft18|A':
    'Hit soft 18 into an ace. Under H17 the dealer ace is even stronger than usual, your 18 isn\'t enough, and the soft hand risks nothing by drawing.',
  'soft18|7':
    'Stand on soft 18 vs 7: assume the dealer has 17. Your 18 beats it outright — don\'t double (the edge is too thin) and don\'t hit a hand that\'s already winning the most likely matchup.',
  'soft19|6':
    'Soft 19 vs 6 is a double — but only under H17, and only against the 6. It looks greedy with a made 19, yet the dealer\'s 6 breaks so often that the second bet earns more than the safety of standing. This is a famous "the book is bolder than you" cell.',
  'soft17|6':
    'Never just stand on soft 17 — a 17 that can\'t bust should always try to improve. Against the dealer\'s weakest cards, double it: you get money in against a breaking hand with zero bust risk on the draw.',
  'soft13|5':
    'Double A2 vs 5-6: it\'s not about your 13 — it\'s a bet that the dealer breaks while your soft hand takes a free draw. Against 4 and below the break rate isn\'t high enough; just hit.',
  'pairA|A':
    'Always split aces. Each ace starting a new hand is worth about +0.5 bets; playing them as soft 12 is one of the worst hands in the game. You only get one card on each — that\'s still a bargain.',
  'pair8|10':
    'Split 8s even against a ten. Sixteen is the worst total in blackjack — splitting turns one terrible hand into two mediocre-but-playable ones. You will lose money in this spot either way; splitting simply loses less than hitting or standing on 16.',
  'pair8|A':
    'Under H17 with surrender available, 8,8 vs ace is the one pair you give up: even two fresh 8-hands can\'t recoup enough against an ace that re-draws soft 17. Without surrender, split — 16 is still the worst hand in the game.',
  'pair10|6':
    'Never split 10s. Twenty wins about 85% of the time played as-is; breaking it chases two good-but-worse hands and turns a near-lock into a gamble. (Card counters split them only at very high counts — and even then it draws looks at the table.)',
  'pair9|7':
    'Stand with 9,9 vs 7 — assume the dealer\'s hole card is a ten, giving 17, and your 18 already beats it. Against 8 or 9 you split (18 isn\'t enough there), which makes this cell a favorite trick question.',
  'pair9|8':
    'Split 9,9 vs 8: standing on 18 against a likely 18 is a push at best, and two hands starting from 9 are strong. Note the asymmetry with the 7 (stand — your 18 beats a likely 17).',
  'pair5|5':
    'Never split 5s — that\'s a hard 10, one of the best doubling hands. Splitting turns a great total into two weak hands starting from 5. Double vs 2-9, hit vs 10/A.',
  'pair4|5':
    'With double-after-split allowed, 4,4 splits against 5 and 6 only: each 4 can become 9-11 for a favorable double against a breaking dealer. Everywhere else, an 8 is just a hit.',
  'pair7|10':
    'Hit 7,7 vs 10 — splitting sends good money after bad (each 7 into a ten-up dealer is a losing hand), and 14 must draw against a made-hand threat.',
  'pair6|2':
    'With DAS, split 6,6 vs 2. Each 6 is playable against a breaking card, and after a good draw you can double. Without DAS this is a hit — the 2 is only barely weak.',
  'pair2|2':
    'With DAS, split 2s and 3s against 2-7. Small pairs split to chase the dealer\'s breaking cards; the double-after-split option is what makes the marginal columns (2 and 3) profitable.',
  insurance:
    'Insurance is a side bet that the dealer\'s hole card is a ten — it pays 2:1, but only 4 of 13 ranks win it (~31%), so it loses about 7.7% per dollar. It has nothing to do with how good your hand is; even "even money" on your blackjack is the same bad bet in disguise. Card counters take it only when the true count shows tens are concentrated (TC +3 or higher).',
}

/** Reasoning templates for uncurated cells, built from the classic primitives. */
function fallbackBody(key: HandKey, up: Rank, correct: Action): string {
  const upN = normalizeRank(up)
  const weakDealer = ['2', '3', '4', '5', '6'].includes(upN)
  const label = handKeyLabel(key)
  const dealerDesc = weakDealer
    ? `The dealer's ${upN} is a breaking card — they must keep drawing and bust often.`
    : `With a ${upN} showing, assume a ten in the hole: play as if the dealer already has ${upN === 'A' ? 'a strong ace hand' : `${Number(upN === '10' ? 20 : Number(upN) + 10)}`}.`

  switch (correct) {
    case 'stand':
      if (key.kind !== 'pair' && key.total >= 17)
        return `With ${label}, you stand no matter what the dealer shows — the risk of busting outweighs any improvement, and made hands ride.`
      return `${dealerDesc} Standing on ${label} lets a breaking dealer do the losing for you; hitting risks busting a hand that can win without drawing.`
    case 'hit':
      if (key.kind === 'hard' && key.total <= 11)
        return `${label} can't bust — a hit is a free card. Draw toward a strong total before deciding anything else.`
      if (key.kind === 'soft')
        return `${dealerDesc} A soft ${key.total} can't bust with one card — hitting is a risk-free chance to improve a total that isn't strong enough to stand on here.`
      return `${dealerDesc} Standing on ${label} only wins if the dealer breaks, and with a ${upN} up that's too rare — you have to draw toward a competitive hand even at some bust risk.`
    case 'double':
      if (key.kind === 'soft')
        return `${dealerDesc} Doubling ${label} presses money in while your soft hand takes a one-card draw with no bust risk — the profit comes as much from the dealer breaking as from your total.`
      return `${dealerDesc} ${label} is a favorite here — doubling gets a second bet out exactly when the odds are on your side, which is where blackjack profit actually comes from.`
    case 'split':
      return `${dealerDesc} Splitting ${label} turns one mediocre hand into two hands that each start in better shape — especially with double-after-split available.`
    case 'surrender':
      return `${label} against a ${upN} loses well over half its value played out. Surrender caps the loss at exactly half a bet — folding a nearly-dead hand is the mathematically cheaper exit.`
  }
}

export function explainDecision(
  key: HandKey,
  up: Rank,
  correct: CorrectPlay,
  chosen: Action,
  trueCount?: number
): Explanation {
  const wasCorrect = chosen === correct.action
  const headline = wasCorrect
    ? `Correct — ${ACTION_LABELS[correct.action]} is the book play`
    : `${ACTION_LABELS[chosen]} was a mistake — the book play is ${ACTION_LABELS[correct.action]}`

  let body: string
  if (correct.source === 'deviation') {
    const dev = DEVIATIONS.find((d) => d.id === correct.deviationId)
    const basicNote = 'Basic strategy alone plays this differently, but the count changes the math. '
    body = basicNote + (dev?.reason ?? '') + (trueCount !== undefined ? ` (True count: ${trueCount >= 0 ? '+' : ''}${trueCount}.)` : '')
  } else {
    body = CURATED[`${handKeyToString(key)}|${normalizeRank(up)}`] ?? fallbackBody(key, up, correct.action)
  }
  return { headline, body }
}

export function explainInsurance(
  took: boolean,
  correctTake: boolean,
  mode: 'basic' | 'counting',
  trueCount: number
): Explanation {
  const wasCorrect = took === correctTake
  const headline = wasCorrect
    ? `Correct — ${correctTake ? 'insurance pays here' : 'never take insurance'}`
    : correctTake
      ? 'Mistake — this is the rare spot where insurance is right'
      : 'Mistake — insurance is a losing side bet'
  let body = CURATED['insurance']
  if (mode === 'counting') {
    body +=
      trueCount >= 3
        ? ` Right now the true count is +${trueCount}: more than a third of the remaining cards are ten-value, which flips insurance into a profitable bet.`
        : ` The current true count (${trueCount >= 0 ? '+' : ''}${trueCount}) is below +3, so the shoe isn't ten-rich enough — decline it.`
  }
  return { headline, body }
}
