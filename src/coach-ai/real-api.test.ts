import { describe, it, expect } from 'vitest'
import { requestCoachRead } from './client'
import { runLiveAnalysis, type AiCoachAssessment } from './live'
import type { CoachDigest } from './summary'

/**
 * Live quality check against the real Claude API. SKIPPED unless a key is
 * present, so `npm test` stays offline like the rest of the suite:
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npx vitest run src/coach-ai/real-api.test.ts
 *
 * Every other coach-ai test mocks the API and proves the plumbing works. This
 * one exists to answer a question mocks can't: is the READ any good? The
 * fixture below is built so that a coach following the prompt has to notice
 * three specific things, and each assertion checks one of them. Failures here
 * are prompt bugs, not code bugs — tune src/coach-ai/{client,live}.ts.
 */

const softDoubleCells = [
  'A,2 vs 5',
  'A,3 vs 5',
  'A,4 vs 4',
  'A,5 vs 4',
  'A,6 vs 3',
  'A,7 vs 2',
  'A,7 vs 3',
  'A,8 vs 6',
]

/**
 * A player with a deliberately shaped record:
 *
 *  1. Eight soft-double cells missed ONCE each. No cell repeats, so anything
 *     that ranks by frequency sees noise; the pattern only appears if you
 *     group the cells into "the soft-double row".
 *  2. doubledWrongly is high relative to doublesMade — they over-apply
 *     doubling on hard hands while under-doubling soft ones. Not a gap, a
 *     half-learned rule. Naming it as "double more" would be actively wrong.
 *  3. hard 16 vs 10 loses most of the time and the expectation says it should.
 *     A coach that sends them to "fix" it is misreading variance.
 */
const digest: CoachDigest = {
  handsPlayed: 240,
  mode: 'counting',
  rank: 'Regular',
  overallAccuracy: 0.91,
  gradedDecisions: 318,
  streak: { current: 6, best: 24 },
  bankroll: { current: 430, totalBuyIn: 500, net: -70 },
  accuracyByCategory: {
    hard: { seen: 168, pct: 0.96 },
    soft: { seen: 52, pct: 0.71 },
    pairs: { seen: 44, pct: 0.93 },
    surrender: { seen: 12, pct: 1 },
    insurance: { seen: 18, pct: 1 },
    deviations: { seen: 24, pct: 0.88 },
  },
  accuracyTrend: [
    { window: 'first 100', pct: 0.88 },
    { window: 'middle 100', pct: 0.92 },
    { window: 'last 118', pct: 0.92 },
  ],
  topMistakes: [
    { spot: 'hard 12 vs 3', wrongOf: '3/9', theyDid: 'hit', bookSays: 'stand' },
    { spot: 'A,7 vs 9', wrongOf: '2/5', theyDid: 'stand', bookSays: 'hit' },
  ],
  everyMissedSpot: [
    ...softDoubleCells.map((spot) => ({
      spot,
      wrongOf: '1/1',
      theyDid: 'hit',
      bookSays: 'double',
    })),
    { spot: 'hard 12 vs 3', wrongOf: '3/9', theyDid: 'hit', bookSays: 'stand' },
    { spot: 'A,7 vs 9', wrongOf: '2/5', theyDid: 'stand', bookSays: 'hit' },
    { spot: 'hard 9 vs 7', wrongOf: '1/4', theyDid: 'double', bookSays: 'hit' },
    { spot: 'hard 10 vs 10', wrongOf: '1/6', theyDid: 'double', bookSays: 'hit' },
    { spot: 'hard 8 vs 6', wrongOf: '1/3', theyDid: 'double', bookSays: 'hit' },
  ],
  actionBreakdown: {
    softDoubles: { offered: 14, taken: 6 },
    hardDoubles: { offered: 22, taken: 21 },
    doubledWrongly: 9,
    doublesMade: 36,
    splits: { offered: 16, taken: 15 },
    splitWrongly: 1,
    softHands: { seen: 52, stoodWrongly: 11 },
    stiffs: { vsWeakDealer: 41, hitWrongly: 4, vsStrongDealer: 58, stoodWrongly: 2 },
  },
  worstMatchups: [
    {
      spot: 'hard 16 vs 10',
      hands: 22,
      lossRate: 0.73,
      centsPerDollar: -52,
      expectedCentsPerDollar: -54,
      underperforming: false,
    },
    {
      spot: 'soft 18 vs 9',
      hands: 14,
      lossRate: 0.64,
      centsPerDollar: -38,
      expectedCentsPerDollar: -18,
      underperforming: true,
    },
  ],
  detectedTendencies: [
    { title: 'Missed soft doubles', kind: 'missed-soft-doubles', count: 8, ofChances: 14 },
    { title: 'Doubling too often', kind: 'over-doubling', count: 9, ofChances: 36 },
  ],
  strengths: [
    'Hard totals — 96% across 168 decisions',
    'Never took insurance — 18 of 18 declined',
  ],
  skills: [
    { name: 'Basic Strategy', level: 'Solid', xp: 2400, recentForm: 0.92 },
    { name: 'Keeping the Count', level: 'Learning', xp: 900, recentForm: 0.88 },
  ],
  sessions: [
    { decisions: 118, pct: 0.92, net: -30, topIssue: 'soft doubles' },
    { decisions: 100, pct: 0.92, net: 15, topIssue: 'soft doubles' },
    { decisions: 100, pct: 0.88, net: -55, topIssue: 'stiffs vs weak dealer' },
  ],
  countQuizzes: { asked: 22, runningCorrect: 20 },
  speedDrills: { runs: 4, correct: 46, bestPace: 1.4 },
}

/** The same player after the soft-double leak is fixed and nothing else moved. */
const improvedDigest: CoachDigest = {
  ...digest,
  handsPlayed: 360,
  gradedDecisions: 470,
  overallAccuracy: 0.94,
  accuracyByCategory: {
    ...digest.accuracyByCategory,
    soft: { seen: 84, pct: 0.94 },
  },
  everyMissedSpot: digest.everyMissedSpot.filter((m) => !softDoubleCells.includes(m.spot)),
  actionBreakdown: {
    ...digest.actionBreakdown,
    softDoubles: { offered: 26, taken: 24 },
    doubledWrongly: 10,
    doublesMade: 52,
  },
  detectedTendencies: [
    { title: 'Doubling too often', kind: 'over-doubling', count: 10, ofChances: 52 },
  ],
  accuracyTrend: [
    { window: 'first 100', pct: 0.88 },
    { window: 'middle 100', pct: 0.92 },
    { window: 'last 270', pct: 0.96 },
  ],
}

// The project has no @types/node — this test is the only thing that reads env.
declare const process: { env: Record<string, string | undefined> }

const key = process.env.ANTHROPIC_API_KEY ?? ''
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const titles = (a: AiCoachAssessment) =>
  [...a.doingWell, ...a.needsWork, ...a.tips].map((i) => i.title.toLowerCase())

describe.skipIf(!key)('AI coach against the real API', () => {
  it('on-demand read: names the pattern, not the cells', { timeout: 180_000 }, async () => {
    const result = await requestCoachRead(key, digest)
    if (!result.ok) throw new Error(`request failed: ${JSON.stringify(result.error)}`)

    console.log('\n=== ON-DEMAND READ ===\n' + result.text + '\n')
    console.log(`(${words(result.text)} words)\n`)

    // Format contract from the system prompt.
    expect(words(result.text)).toBeGreaterThan(150)
    expect(words(result.text)).toBeLessThan(450)
    expect(result.text).not.toMatch(/^\s*[-*+]\s/m) // no bullet lists
    expect(result.text).not.toMatch(/^\s*\|/m) // no tables
    expect((result.text.match(/^## /gm) ?? []).length).toBeLessThanOrEqual(2)

    // Substance: the whole point is that it sees the soft-double row spread
    // across eight one-off cells, and doesn't just tell them to double more.
    expect(result.text.toLowerCase()).toMatch(/soft/)

    // Listing the cells is fine — good coaching often shows the shape before
    // naming it ("A,2 vs 5, A,3 vs 5, ... that's the entire soft-double row").
    // What must not happen is enumerating them INSTEAD of grouping them, so
    // the cap is conditional: cite freely, but then say what they add up to.
    const citedCells = softDoubleCells.filter((c) => result.text.includes(c)).length
    if (citedCells >= 4) {
      expect(result.text.toLowerCase()).toMatch(/\brow\b|one leak|not eight|whole|entire|pattern/)
    }
  })

  it('live coach: fills the lists and holds the alert bar', { timeout: 180_000 }, async () => {
    const result = await runLiveAnalysis(key, digest, null)
    if (!result.ok) throw new Error(`request failed: ${JSON.stringify(result.error)}`)
    const a = result.assessment

    console.log('\n=== LIVE ASSESSMENT (first run) ===')
    console.log(JSON.stringify(a, null, 2) + '\n')

    expect(a.needsWork.length).toBeGreaterThan(0)
    expect(a.tips.length).toBeGreaterThan(0)
    for (const list of [a.doingWell, a.needsWork, a.tips]) {
      expect(list.length).toBeLessThanOrEqual(4)
      for (const item of list) {
        expect(words(item.title)).toBeGreaterThanOrEqual(2)
        // The prompt asks for 2-5; this only fails on titles that have become
        // sentences, not on a word or two of drift.
        expect(words(item.title)).toBeLessThanOrEqual(8)
        // The prompt asks for one or two sentences. Observed output runs
        // 40-70 words and varies run to run, so this catches a detail that
        // has become a paragraph rather than policing a sentence or two.
        expect(words(item.detail)).toBeLessThanOrEqual(85)
      }
    }
    // Both real leaks should surface somewhere in the assessment.
    const blob = JSON.stringify(a).toLowerCase()
    expect(blob).toMatch(/soft/)
    expect(blob).toMatch(/doubl/)
  })

  it('live coach: carries items forward and drops what got fixed', { timeout: 300_000 }, async () => {
    const first = await runLiveAnalysis(key, digest, null)
    if (!first.ok) throw new Error(`first run failed: ${JSON.stringify(first.error)}`)

    const second = await runLiveAnalysis(key, improvedDigest, first.assessment)
    if (!second.ok) throw new Error(`second run failed: ${JSON.stringify(second.error)}`)

    console.log('\n=== LIVE ASSESSMENT (after the leak is fixed) ===')
    console.log(JSON.stringify(second.assessment, null, 2) + '\n')

    const before = titles(first.assessment)
    const after = titles(second.assessment)
    const carried = after.filter((t) => before.includes(t))
    console.log(`carried forward: ${carried.length}/${after.length} titles\n`)

    // Churn is the failure mode: the list should evolve, not be rewritten.
    expect(carried.length).toBeGreaterThan(0)

    // Only the soft DOUBLES were fixed in improvedDigest — the wrong stands on
    // A,7 vs 9 and the underperforming soft 18 vs 9 are all still in the data.
    // So "no soft item at all" would be the wrong bar: a good coach keeps
    // flagging what is still broken. What must change is the doubling item.
    const mentionsSoftDoubling = (i: { title: string; detail: string }) =>
      /soft/i.test(`${i.title} ${i.detail}`) && /doubl/i.test(`${i.title} ${i.detail}`)

    expect(second.assessment.needsWork.some(mentionsSoftDoubling)).toBe(false)
    // ...and it should get credit for it rather than silently vanishing.
    expect(second.assessment.doingWell.some(mentionsSoftDoubling)).toBe(true)

    // Over-doubling did not improve, so it should still be flagged.
    expect(JSON.stringify(second.assessment).toLowerCase()).toMatch(/doubl/)
  })
})
