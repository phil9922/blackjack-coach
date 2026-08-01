import type { StatsState } from './model'

/**
 * The progress log: sessions derived from the timestamped decision/outcome
 * history. A gap of 45+ minutes starts a new session. Newest first.
 */
export interface SessionSummary {
  start: number
  end: number
  decisions: number
  correct: number
  pct: number | null
  drilled: number
  hinted: number
  hands: number
  net: number
  /** the session's most-repeated mistake, e.g. "hard 16 vs 10 (3× wrong)" */
  topIssue: string | null
}

const GAP_MS = 45 * 60 * 1000

interface Event {
  t: number
  kind: 'decision' | 'outcome'
  wasCorrect?: boolean
  hinted?: boolean
  drilled?: boolean
  keyLabel?: string
  up?: string
  net?: number
}

export function deriveSessions(stats: StatsState): SessionSummary[] {
  const events: Event[] = [
    ...stats.decisions.map((d) => ({
      t: d.t,
      kind: 'decision' as const,
      wasCorrect: d.wasCorrect,
      hinted: d.hinted,
      drilled: d.drilled ?? false,
      keyLabel: d.keyLabel,
      up: d.up,
    })),
    ...stats.outcomes.map((o) => ({ t: o.t, kind: 'outcome' as const, net: o.net })),
  ].sort((a, b) => a.t - b.t)

  if (events.length === 0) return []

  const sessions: SessionSummary[] = []
  let bucket: Event[] = []

  const flush = () => {
    if (bucket.length === 0) return
    const decisions = bucket.filter((e) => e.kind === 'decision')
    const graded = decisions.filter((e) => !e.hinted)
    const wrongCounts = new Map<string, number>()
    for (const d of graded) {
      if (d.wasCorrect === false) {
        const k = `${d.keyLabel} vs ${d.up}`
        wrongCounts.set(k, (wrongCounts.get(k) ?? 0) + 1)
      }
    }
    const top = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    sessions.push({
      start: bucket[0].t,
      end: bucket[bucket.length - 1].t,
      decisions: graded.length,
      correct: graded.filter((e) => e.wasCorrect).length,
      pct: graded.length
        ? Math.round((graded.filter((e) => e.wasCorrect).length / graded.length) * 100)
        : null,
      drilled: decisions.filter((e) => e.drilled).length,
      hinted: decisions.filter((e) => e.hinted).length,
      hands: bucket.filter((e) => e.kind === 'outcome').length,
      net: bucket.reduce((s, e) => s + (e.net ?? 0), 0),
      topIssue: top && top[1] >= 2 ? `${top[0]} (${top[1]}× wrong)` : null,
    })
    bucket = []
  }

  for (const e of events) {
    if (bucket.length > 0 && e.t - bucket[bucket.length - 1].t > GAP_MS) flush()
    bucket.push(e)
  }
  flush()

  return sessions.reverse()
}
