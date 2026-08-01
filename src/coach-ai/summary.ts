import type { StatsState } from '../stats/model'
import {
  overallAccuracy,
  accuracyByCategory,
  accuracyTrend,
  topMistakes,
  worstMatchups,
} from '../stats/analysis'
import { coachTips, strengths } from '../stats/coach'
import { deriveSessions } from '../stats/sessions'
import { SKILLS, skillLevel, skillForm, playerRank } from '../gamify/skills'

/**
 * The compact digest sent to the AI coach. Deliberately small — it's derived
 * numbers and detected patterns, not raw hand history, so a request stays a
 * few hundred tokens no matter how much the user has played.
 */
export interface CoachDigest {
  handsPlayed: number
  mode: string
  rank: string
  overallAccuracy: number | null
  gradedDecisions: number
  streak: { current: number; best: number }
  bankroll: { current: number; totalBuyIn: number; net: number }
  accuracyByCategory: Record<string, { seen: number; pct: number | null }>
  accuracyTrend: { window: string; pct: number | null }[]
  topMistakes: { spot: string; wrongOf: string; theyDid: string; bookSays: string }[]
  worstMatchups: {
    spot: string
    hands: number
    lossRate: number
    centsPerDollar: number
    expectedCentsPerDollar: number
    underperforming: boolean
  }[]
  detectedTendencies: { title: string; kind: string; count: number; ofChances: number }[]
  strengths: string[]
  skills: { name: string; level: string; xp: number; recentForm: number | null }[]
  sessions: { decisions: number; pct: number | null; net: number; topIssue: string | null }[]
  countQuizzes: { asked: number; runningCorrect: number }
  speedDrills: { runs: number; correct: number; bestPace: number }
}

export function buildDigest(
  stats: StatsState,
  opts: { mode: string; bankroll: number; totalBuyIn: number }
): CoachDigest {
  const overall = overallAccuracy(stats)
  const byCat: CoachDigest['accuracyByCategory'] = {}
  for (const [cat, a] of Object.entries(accuracyByCategory(stats))) {
    if (a.seen > 0) byCat[cat] = { seen: a.seen, pct: a.pct }
  }

  return {
    handsPlayed: stats.handsPlayed,
    mode: opts.mode,
    rank: playerRank(stats.skillXp).title,
    overallAccuracy: overall.pct,
    gradedDecisions: overall.seen,
    streak: stats.streak,
    bankroll: {
      current: opts.bankroll,
      totalBuyIn: opts.totalBuyIn,
      net: opts.bankroll - opts.totalBuyIn,
    },
    accuracyByCategory: byCat,
    accuracyTrend: accuracyTrend(stats).map((p) => ({ window: p.label, pct: p.accuracy.pct })),
    topMistakes: topMistakes(stats, 6).map((m) => ({
      spot: `${m.keyLabel} vs ${m.up}`,
      wrongOf: `${m.wrong}/${m.seen}`,
      theyDid: m.mostCommonWrongAction,
      bookSays: m.correctAction,
    })),
    worstMatchups: worstMatchups(stats.outcomes, 5).map((m) => ({
      spot: `${m.bucket} vs ${m.up}`,
      hands: m.n,
      lossRate: Math.round(m.lossRate * 100) / 100,
      centsPerDollar: Math.round(m.evPerBet * 100),
      expectedCentsPerDollar: Math.round(m.expectedEvPerBet * 100),
      underperforming: m.underperforming,
    })),
    detectedTendencies: coachTips(stats).map((t) => ({
      title: t.title,
      kind: t.bucket,
      count: t.count,
      ofChances: t.opportunities,
    })),
    strengths: strengths(stats).map((s) => `${s.title} — ${s.detail}`),
    skills: SKILLS.map((sk) => {
      const xp = stats.skillXp[sk.id] ?? 0
      return {
        name: sk.name,
        level: skillLevel(xp).title,
        xp,
        recentForm: skillForm(stats, sk.id).pct,
      }
    }).filter((s) => s.xp > 0),
    sessions: deriveSessions(stats)
      .slice(0, 8)
      .map((s) => ({ decisions: s.decisions, pct: s.pct, net: s.net, topIssue: s.topIssue })),
    countQuizzes: { asked: stats.countQuizzes.asked, runningCorrect: stats.countQuizzes.rcCorrect },
    speedDrills: stats.speedDrills,
  }
}

/** Enough history for the coach to say anything useful. */
export function hasEnoughHistory(stats: StatsState): boolean {
  return stats.decisions.filter((d) => !d.hinted).length >= 20
}
