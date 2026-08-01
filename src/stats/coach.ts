import type { DecisionRecord, StatsState } from './model'
import { unassisted, accuracyByCategory, accuracyTrend, worstMatchups } from './analysis'

export interface CoachTip {
  id: string
  bucket: 'mistake' | 'missed-opportunity'
  title: string
  tip: string
  count: number
  opportunities: number
  examples: string[]
}

interface TendencyRule {
  id: string
  bucket: 'mistake' | 'missed-opportunity'
  title: string
  /** decisions that are instances of this leak */
  match: (d: DecisionRecord) => boolean
  /** decisions where the leak COULD have happened (denominator) */
  opportunity: (d: DecisionRecord) => boolean
  minCount: number
  minRate: number
  tip: (examples: string[], count: number) => string
}

const isStiff = (d: DecisionRecord) => {
  const t = Number(d.keyStr.replace('hard', ''))
  return d.keyStr.startsWith('hard') && t >= 12 && t <= 16
}
const weakUp = (d: DecisionRecord) => ['2', '3', '4', '5', '6'].includes(d.up)
const strongUp = (d: DecisionRecord) => !weakUp(d)
const ex = (d: DecisionRecord) => `${d.keyLabel} vs ${d.up}`

const RULES: TendencyRule[] = [
  {
    id: 'missed-soft-doubles',
    bucket: 'missed-opportunity',
    title: 'Not doubling soft hands',
    match: (d) => d.correct === 'double' && !d.wasCorrect && d.keyStr.startsWith('soft'),
    opportunity: (d) => d.correct === 'double' && d.keyStr.startsWith('soft'),
    minCount: 3,
    minRate: 0.25,
    tip: (examples, count) =>
      `You've passed up ${count} soft doubles (${examples.join(', ')}). This is the most common way good players leave money on the table: a soft hand looks decent, so you protect it. But the ace means the draw can't bust you — a soft double is a bet on the dealer breaking, not on your total. Under these rules: A,2-A,3 double vs 5-6; A,4-A,5 double vs 4-6; A,6 doubles vs 3-6; A,7 doubles vs 2-6; and A,8 doubles vs 6.`,
  },
  {
    id: 'missed-hard-doubles',
    bucket: 'missed-opportunity',
    title: 'Not doubling strong hard totals',
    match: (d) => d.correct === 'double' && !d.wasCorrect && !d.keyStr.startsWith('soft'),
    opportunity: (d) => d.correct === 'double' && !d.keyStr.startsWith('soft'),
    minCount: 3,
    minRate: 0.25,
    tip: (examples, count) =>
      `You've passed up ${count} hard doubles (${examples.join(', ')}). These are the clearest edges in the game — get the extra bet out. Always double 11 (against everything, ace included, under these rules), double 10 except against a 10 or ace, and double 9 against 3 through 6.`,
  },
  {
    id: 'over-doubling',
    bucket: 'mistake',
    title: 'Doubling on hands too weak to double',
    match: (d) => d.chosen === 'double' && !d.wasCorrect,
    opportunity: (d) => d.chosen === 'double',
    minCount: 3,
    minRate: 0.2,
    tip: (examples, count) =>
      `${count} of your doubles weren't called for (${examples.join(', ')}). This is the overcorrection that follows learning to double more: a breaking dealer is only half the condition. Doubling means you take exactly one card and can't hit again — so you also need a hand that one card can turn into a winner. 9, 10, and 11 qualify; 12 through 16 do not, no matter how weak the dealer looks.`,
  },
  {
    id: 'missed-splits',
    bucket: 'missed-opportunity',
    title: 'Skipping correct splits',
    match: (d) => d.correct === 'split' && !d.wasCorrect,
    opportunity: (d) => d.correct === 'split',
    minCount: 4,
    minRate: 0.25,
    tip: (examples, count) =>
      `You've declined ${count} correct splits (${examples.join(', ')}). Always split aces and 8s — a 16 is the worst hand in the game, and two 8s each draw to something playable. Small pairs (2s, 3s, 6s, 7s) split against the dealer's breaking cards 2-7.`,
  },
  {
    id: 'missed-surrenders',
    bucket: 'missed-opportunity',
    title: 'Not surrendering hopeless hands',
    match: (d) => d.correct === 'surrender' && !d.wasCorrect,
    opportunity: (d) => d.correct === 'surrender',
    minCount: 3,
    minRate: 0.3,
    tip: (examples, count) =>
      `You've played out ${count} hands the book folds (${examples.join(', ')}). Surrender feels like quitting, but these spots lose more than half a bet on average — taking the guaranteed half-loss is the cheaper exit. Under these rules: surrender 16 vs 9/10/A, 15 vs 10/A, and 17 vs A.`,
  },
  {
    id: 'overhit-stiffs',
    bucket: 'mistake',
    title: 'Busting into a breaking dealer',
    match: (d) => d.chosen === 'hit' && d.correct === 'stand' && isStiff(d) && weakUp(d),
    opportunity: (d) => isStiff(d) && weakUp(d),
    minCount: 4,
    minRate: 0.2,
    tip: (examples, count) =>
      `${count} times you've hit a stiff hand against a dealer bust card (${examples.join(', ')}). When the dealer shows 2-6 they must keep drawing and break often — your 12-16 wins by standing back and letting them. (Exceptions: hit 12 vs 2 and 3.)`,
  },
  {
    id: 'passive-stiffs',
    bucket: 'mistake',
    title: 'Standing short against strong dealers',
    match: (d) => d.chosen === 'stand' && d.correct === 'hit' && isStiff(d) && strongUp(d),
    opportunity: (d) => isStiff(d) && strongUp(d),
    minCount: 4,
    minRate: 0.2,
    tip: (examples, count) =>
      `${count} times you've stood on a stiff against a strong upcard (${examples.join(', ')}). With 7-A showing, assume a ten in the hole: the dealer has a made hand and your 12-16 loses standing pat. You must draw toward a competitive total even at bust risk.`,
  },
  {
    id: 'soft-stands',
    bucket: 'mistake',
    title: 'Freezing soft hands',
    match: (d) => d.chosen === 'stand' && d.correct !== 'stand' && d.keyStr.startsWith('soft'),
    opportunity: (d) => d.keyStr.startsWith('soft'),
    minCount: 4,
    minRate: 0.2,
    tip: (examples, count) =>
      `You've stood on soft hands that should keep improving ${count} times (${examples.join(', ')}). This usually comes from carrying a hard-total rule across to soft hands: "17 or more, stand" is right for hard totals and wrong for soft ones. Hard 17 is a full stop; soft 17 is a decision — it can't bust on one card, so it always draws, and soft 18 only stands against 2, 7, or 8.`,
  },
  {
    id: 'bad-splits',
    bucket: 'mistake',
    title: 'Splitting hands that should stay whole',
    match: (d) => d.chosen === 'split' && d.correct !== 'split',
    opportunity: (d) => d.keyStr.startsWith('pair'),
    minCount: 3,
    minRate: 0.15,
    tip: (examples, count) =>
      `You've broken up ${count} hands the book keeps together (${examples.join(', ')}). Never split 10s (20 is a near-lock) or 5s (that's a hard 10 — double it). 4s only split vs 5-6, and 9s stand against 7, 10, and A.`,
  },
  {
    id: 'insurance-leak',
    bucket: 'mistake',
    title: 'Paying for insurance',
    match: (d) => d.category === 'insurance' && !d.wasCorrect && d.chosen === 'take-insurance',
    opportunity: (d) => d.category === 'insurance',
    minCount: 3,
    minRate: 0.25,
    tip: (_examples, count) =>
      `You've taken insurance ${count} times when it was -EV. Insurance is a side bet that the hole card is a ten — it wins only ~31% of the time and costs about 7.7% per dollar long-run. Unless you're counting and the true count is +3 or better, always decline (even "even money" on your blackjack).`,
  },
  {
    id: 'missed-deviations',
    bucket: 'missed-opportunity',
    title: 'Ignoring the count at decision time',
    match: (d) => d.category === 'deviation' && !d.wasCorrect,
    opportunity: (d) => d.category === 'deviation',
    minCount: 3,
    minRate: 0.3,
    tip: (examples, count) =>
      `${count} times the count called for a deviation and you played straight basic strategy (${examples.join(', ')}). The big ones to memorize first: insurance at TC +3, stand 16 vs 10 at TC 0+, stand 15 vs 10 at TC +4, and 12 vs 3 stands at TC +2.`,
  },
]

export function coachTips(stats: StatsState): CoachTip[] {
  const ds = unassisted(stats.decisions)
  const tips: CoachTip[] = []
  for (const rule of RULES) {
    const opportunities = ds.filter(rule.opportunity)
    const hits = ds.filter(rule.match)
    if (hits.length < rule.minCount) continue
    if (opportunities.length > 0 && hits.length / opportunities.length < rule.minRate) continue
    const examples = [...new Set(hits.slice(-6).map(ex))].slice(0, 3)
    tips.push({
      id: rule.id,
      bucket: rule.bucket,
      title: rule.title,
      tip: rule.tip(examples, hits.length),
      count: hits.length,
      opportunities: opportunities.length,
      examples,
    })
  }
  return tips.sort((a, b) => b.count / Math.max(b.opportunities, 1) - a.count / Math.max(a.opportunities, 1))
}

export interface Strength {
  title: string
  detail: string
}

const CAT_NAMES: Record<string, string> = {
  hard: 'hard totals',
  soft: 'soft hands',
  pair: 'pairs',
  surrender: 'surrender decisions',
  deviation: 'count deviations',
  insurance: 'insurance decisions',
}

/** What the user is doing RIGHT — mastered areas, cleaned-up cells, momentum. */
export function strengths(stats: StatsState): Strength[] {
  const out: Strength[] = []
  const ds = unassisted(stats.decisions)

  // Mastered categories: enough volume, high accuracy.
  for (const [cat, a] of Object.entries(accuracyByCategory(stats))) {
    if (a.seen >= 15 && a.pct !== null && a.pct >= 90) {
      out.push({
        title: `Solid on ${CAT_NAMES[cat]}`,
        detail: `${a.pct}% correct over ${a.seen} decisions — this part of your game is trustworthy.`,
      })
    }
  }

  // Trap cells handled perfectly at meaningful volume.
  const cells = new Map<string, { label: string; seen: number; correct: number }>()
  for (const d of ds) {
    const id = `${d.keyStr}|${d.up}`
    const c = cells.get(id) ?? { label: `${d.keyLabel} vs ${d.up}`, seen: 0, correct: 0 }
    c.seen++
    if (d.wasCorrect) c.correct++
    cells.set(id, c)
  }
  const perfect = [...cells.values()]
    .filter((c) => c.seen >= 5 && c.correct === c.seen)
    .sort((a, b) => b.seen - a.seen)
    .slice(0, 3)
  for (const c of perfect) {
    out.push({ title: `${c.label}: ${c.seen}/${c.seen}`, detail: 'Never missed it. Locked in.' })
  }

  // Most-improved category: first half vs second half of its own history.
  let bestImprovement: { cat: string; from: number; to: number } | null = null
  for (const cat of Object.keys(CAT_NAMES)) {
    const catDs = ds.filter((d) => d.category === cat)
    if (catDs.length < 16) continue
    const half = Math.floor(catDs.length / 2)
    const pctOf = (arr: typeof catDs) =>
      Math.round((arr.filter((d) => d.wasCorrect).length / arr.length) * 100)
    const from = pctOf(catDs.slice(0, half))
    const to = pctOf(catDs.slice(half))
    if (to - from >= 15 && (!bestImprovement || to - from > bestImprovement.to - bestImprovement.from)) {
      bestImprovement = { cat, from, to }
    }
  }
  if (bestImprovement) {
    out.push({
      title: `Most improved: ${CAT_NAMES[bestImprovement.cat]}`,
      detail: `${bestImprovement.from}% in your early play, ${bestImprovement.to}% recently — the training is landing.`,
    })
  }

  if (stats.streak.best >= 15) {
    out.push({
      title: `Best streak: ${stats.streak.best} in a row`,
      detail: 'Long correct runs mean the book is becoming reflex, not recall.',
    })
  }

  return out
}

export interface CoachReport {
  tips: CoachTip[]
  focus: string | null
  trendSummary: string | null
  outcomeInsights: string[]
}

export function coachReport(stats: StatsState): CoachReport {
  const tips = coachTips(stats)
  const byCat = accuracyByCategory(stats)

  // What to practice next: weakest category with enough volume.
  let focus: string | null = null
  let worstPct = 101
  const catLabels: Record<string, string> = {
    hard: 'hard totals',
    soft: 'soft hands',
    pair: 'pairs',
    surrender: 'surrender decisions',
    deviation: 'count deviations',
    insurance: 'insurance decisions',
  }
  for (const [cat, a] of Object.entries(byCat)) {
    if (a.seen >= 10 && a.pct !== null && a.pct < worstPct) {
      worstPct = a.pct
      focus = `${catLabels[cat]} (${a.pct}% over ${a.seen} decisions)`
    }
  }

  // Trend: compare first and last windows.
  const trend = accuracyTrend(stats)
  let trendSummary: string | null = null
  if (trend.length >= 2) {
    const first = trend[0].accuracy.pct
    const last = trend[trend.length - 1].accuracy.pct
    if (first !== null && last !== null) {
      trendSummary =
        last > first
          ? `Your accuracy has climbed from ${first}% to ${last}% — keep going.`
          : last < first
            ? `Your accuracy has slipped from ${first}% to ${last}% recently — worth slowing down on each decision.`
            : `Your accuracy is holding steady at ${last}%.`
    }
  }

  // Outcome trends: where results run below what perfect play would expect.
  const outcomeInsights: string[] = []
  for (const m of worstMatchups(stats.outcomes, 3)) {
    const spot = `${m.bucket} vs dealer ${m.up}`
    if (m.underperforming) {
      outcomeInsights.push(
        `You're losing ${Math.round(m.lossRate * 100)}% of hands with ${spot} (${m.n} hands) — noticeably worse than perfect play expects there. Check the related decisions; that gap is usually a strategy leak, not bad luck.`
      )
    } else if (m.evPerBet < -0.2) {
      outcomeInsights.push(
        `${spot} is your biggest bleed (${Math.round(m.lossRate * 100)}% losses over ${m.n} hands) — but your results are close to what perfect play expects. That's just a hard spot in blackjack; don't change your play there.`
      )
    }
  }

  return { tips, focus, trendSummary, outcomeInsights }
}
