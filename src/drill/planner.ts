import type { Rank, TrainingMode } from '../engine/types'
import type { StatsState } from '../stats/model'
import { unassisted } from '../stats/analysis'
import { DEVIATIONS } from '../strategy/deviations'
import { handKeyToString } from '../strategy/types'

/**
 * Drill mode: the trainer learns where the user struggles and deals more of
 * those situations. A plan is a weighted pool of spots; the reducer picks one
 * per deal. Weights come from the user's own mistakes (heavier when repeated
 * and recent), blended with a curated pool of famously misplayed hands and a
 * slice of fully random deals so the drill never becomes predictable.
 * As a spot gets played correctly, its mistake weight decays on its own.
 */
export interface DrillSpot {
  label: string
  /** null = deal naturally (the random escape) */
  playerRanks: [Rank, Rank] | null
  dealerUp: Rank | null
  weight: number
  /**
   * Counting drills: move the shoe to this true count first, by burning cards
   * to the discard tray (honest — the cards really leave the shoe, exactly as
   * if you sat down mid-shoe). Undefined for plain basic-strategy drills.
   */
  targetTrueCount?: number
}

export interface DrillPlan {
  spots: DrillSpot[]
}

const HARD_RANKS: Record<number, [Rank, Rank]> = {
  5: ['2', '3'], 6: ['2', '4'], 7: ['3', '4'], 8: ['3', '5'], 9: ['4', '5'],
  10: ['4', '6'], 11: ['5', '6'], 12: ['10', '2'], 13: ['10', '3'], 14: ['10', '4'],
  15: ['10', '5'], 16: ['10', '6'], 17: ['10', '7'], 18: ['10', '8'], 19: ['10', '9'],
}

/** Concrete two-card ranks that produce a strategy key like "hard16" / "soft18" / "pair8". */
export function ranksForKey(keyStr: string): [Rank, Rank] | null {
  if (keyStr === 'insurance') return ['10', '9']
  if (keyStr.startsWith('pair')) {
    const r = keyStr.slice(4) as Rank
    return [r, r]
  }
  if (keyStr.startsWith('soft')) {
    const total = Number(keyStr.slice(4))
    if (total < 13 || total > 20) return null
    return ['A', String(total - 11) as Rank]
  }
  if (keyStr.startsWith('hard')) {
    return HARD_RANKS[Number(keyStr.slice(4))] ?? null
  }
  return null
}

/** Famously misplayed spots — the drill's backbone before there's history. */
const CURATED: { key: string; up: Rank }[] = [
  { key: 'hard16', up: '10' }, { key: 'hard16', up: '9' }, { key: 'hard15', up: '10' },
  { key: 'hard12', up: '2' }, { key: 'hard12', up: '3' }, { key: 'hard12', up: '4' },
  { key: 'hard13', up: '2' }, { key: 'hard11', up: 'A' }, { key: 'hard10', up: '10' },
  { key: 'hard9', up: '2' }, { key: 'hard9', up: '3' }, { key: 'hard9', up: '7' },
  { key: 'soft18', up: '2' }, { key: 'soft18', up: '7' }, { key: 'soft18', up: '9' },
  { key: 'soft18', up: '10' }, { key: 'soft17', up: '3' }, { key: 'soft19', up: '6' },
  { key: 'soft16', up: '4' },
  { key: 'pair8', up: '10' }, { key: 'pair8', up: 'A' }, { key: 'pair9', up: '7' },
  { key: 'pair9', up: '8' }, { key: 'pairA', up: '5' }, { key: 'pair4', up: '5' },
  { key: 'pair5', up: '6' }, { key: 'pair10', up: '6' }, { key: 'pair7', up: '10' },
  { key: 'insurance', up: 'A' },
]

function spotLabel(keyStr: string, up: Rank): string {
  if (keyStr === 'insurance') return 'insurance decision'
  const pretty = keyStr.startsWith('pair')
    ? `${keyStr.slice(4)},${keyStr.slice(4)}`
    : keyStr.replace('hard', 'hard ').replace('soft', 'soft ')
  return `${pretty} vs ${up}`
}

/** How many recent decisions count as "recent" for the recency boost. */
const RECENT_WINDOW = 200

function fmtTc(tc: number): string {
  return `${tc >= 0 ? '+' : ''}${tc}`
}

/**
 * Counting-mode drills: put the player in a spot where an index play is (or
 * pointedly is NOT) the right move. Both variants are generated — always
 * dealing live indices would teach "drill hand = deviate" instead of judgment.
 */
function deviationSpots(ds: ReturnType<typeof unassisted>, baseWeight: number): DrillSpot[] {
  const spots: DrillSpot[] = []
  for (const dev of DEVIATIONS) {
    const ranks = ranksForKey(handKeyToString(dev.key))
    if (!ranks) continue

    // Deviations the user has actually botched get drilled harder.
    const misses = ds.filter(
      (d) =>
        d.category === 'deviation' &&
        !d.wasCorrect &&
        d.keyStr === handKeyToString(dev.key) &&
        d.up === dev.dealerUp
    ).length

    const live = dev.dir === 'atOrAbove' ? dev.threshold : dev.threshold
    const short = dev.dir === 'atOrAbove' ? dev.threshold - 1 : dev.threshold + 1
    const spot = (tc: number, weight: number): DrillSpot => ({
      label: `${handKeyToString(dev.key).replace('hard', 'hard ').replace('pair', 'pair of ')} vs ${dev.dealerUp} at TC ${fmtTc(tc)}`,
      playerRanks: ranks,
      dealerUp: dev.dealerUp,
      targetTrueCount: tc,
      weight,
    })
    spots.push(spot(live, baseWeight * 2 + misses * 4))
    spots.push(spot(short, baseWeight + misses * 2))
  }
  return spots
}

export function buildDrillPlan(stats: StatsState, mode: TrainingMode = 'basic'): DrillPlan {
  const ds = unassisted(stats.decisions)
  const recentStart = Math.max(0, ds.length - RECENT_WINDOW)

  // Aggregate the user's own mistakes per (hand, upcard) cell.
  const cells = new Map<string, { keyStr: string; up: Rank; wrong: number; recentWrong: number; seen: number }>()
  ds.forEach((d, i) => {
    const id = `${d.keyStr}|${d.up}`
    const cell = cells.get(id) ?? { keyStr: d.keyStr, up: d.up, wrong: 0, recentWrong: 0, seen: 0 }
    cell.seen++
    if (!d.wasCorrect) {
      cell.wrong++
      if (i >= recentStart) cell.recentWrong++
    }
    cells.set(id, cell)
  })

  const spots: DrillSpot[] = []
  for (const cell of cells.values()) {
    if (cell.wrong === 0) continue
    const ranks = ranksForKey(cell.keyStr)
    if (!ranks) continue
    // Repeated mistakes weigh more; recent ones more still. Getting a cell
    // right doesn't erase history, but the recency boost fades naturally.
    spots.push({
      label: spotLabel(cell.keyStr, cell.up),
      playerRanks: ranks,
      dealerUp: cell.keyStr === 'insurance' ? 'A' : cell.up,
      weight: cell.wrong * 2 + cell.recentWrong * 3,
    })
  }

  const mistakeMass = spots.reduce((s, x) => s + x.weight, 0)

  // Curated trap pool: a meaningful floor when history is thin, a light
  // seasoning once the user's own leaks dominate. Spots the user already
  // trips on are covered above — don't list them twice.
  const taken = new Set(spots.map((s) => s.label))
  const curatedEach = Math.max(0.5, mistakeMass * 0.015)
  for (const c of CURATED) {
    const ranks = ranksForKey(c.key)
    const label = spotLabel(c.key, c.up)
    if (!ranks || taken.has(label)) continue
    spots.push({ label, playerRanks: ranks, dealerUp: c.up, weight: curatedEach })
  }

  // Counting mode adds index-play scenarios on top of the basic-strategy pool.
  if (mode === 'counting') {
    spots.push(...deviationSpots(ds, curatedEach * 1.5))
  }

  // Random escape: ~20% of deals stay natural so the drill can't be gamed.
  const total = spots.reduce((s, x) => s + x.weight, 0)
  spots.push({ label: 'natural deal', playerRanks: null, dealerUp: null, weight: total * 0.25 })

  return { spots }
}

/** The current top drill targets, for display on the Progress screen. */
export function drillTargets(plan: DrillPlan, n = 6): DrillSpot[] {
  return plan.spots
    .filter((s) => s.playerRanks !== null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n)
}
