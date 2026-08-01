import type { DecisionRecord, StatsState } from '../stats/model'

/**
 * Gamification: blackjack broken into seven skills to master. Every graded
 * decision feeds exactly one skill; quizzes and count-driven bets feed the
 * counting skills. XP always accumulates; "form" (rolling accuracy) shows
 * whether the skill is currently sharp — mastery is holding both.
 */
export type SkillId = 'hard' | 'soft' | 'pairs' | 'doubles' | 'defense' | 'count' | 'countplay'

export interface SkillMeta {
  id: SkillId
  name: string
  glyph: string
  description: string
  countingOnly: boolean
}

export const SKILLS: SkillMeta[] = [
  {
    id: 'hard',
    name: 'Hard Hands',
    glyph: '♠',
    description: 'Hit-or-stand judgment on hard totals — the backbone of the game, and where stiff hands punish guesswork.',
    countingOnly: false,
  },
  {
    id: 'soft',
    name: 'Soft Hands',
    glyph: '♥',
    description: 'Playing the ace as a safety net: soft hands can\'t bust on one card, and most players waste that.',
    countingOnly: false,
  },
  {
    id: 'pairs',
    name: 'Pairs & Splits',
    glyph: '⧉',
    description: 'Knowing which pairs to break and which to keep whole — aces and 8s always, tens and 5s never.',
    countingOnly: false,
  },
  {
    id: 'doubles',
    name: 'Pressing the Edge',
    glyph: '×2',
    description: 'Doubling down when the odds favor you. This is where blackjack profit actually comes from.',
    countingOnly: false,
  },
  {
    id: 'defense',
    name: 'Damage Control',
    glyph: '⛨',
    description: 'Folding hopeless hands and refusing bad side bets — surrender sense and insurance discipline.',
    countingOnly: false,
  },
  {
    id: 'count',
    name: 'Keeping the Count',
    glyph: '±',
    description: 'Tracking the running count through a busy table and converting it to a true count under pressure.',
    countingOnly: true,
  },
  {
    id: 'countplay',
    name: 'Playing the Count',
    glyph: '◎',
    description: 'Acting on the count: strategy deviations, count-based insurance, and sizing bets to your edge.',
    countingOnly: true,
  },
]

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillMeta>

/** Every graded decision belongs to exactly one skill. */
export function skillForDecision(d: Pick<DecisionRecord, 'category' | 'correct' | 'chosen' | 'keyStr'>): SkillId {
  if (d.category === 'insurance') return 'defense'
  if (d.category === 'deviation') return 'countplay'
  if (d.category === 'surrender' || d.chosen === 'surrender') return 'defense'
  if (d.correct === 'double' || d.chosen === 'double') return 'doubles'
  if (d.category === 'pair') return 'pairs'
  if (d.category === 'soft') return 'soft'
  return 'hard'
}

/**
 * XP for one graded decision. Correct plays pay; streaks add a bonus; drilled
 * hands pay extra (they're your hard spots on purpose); hinted plays earn a
 * token amount — hints are for learning, not farming.
 */
export function xpForDecision(input: {
  wasCorrect: boolean
  hinted: boolean
  drilled: boolean
  streakAfter: number
}): number {
  if (input.hinted) return input.wasCorrect ? 3 : 1
  if (!input.wasCorrect) return 1
  let xp = 10
  if (input.drilled) xp += 4
  xp += Math.min(Math.floor(input.streakAfter / 5) * 2, 10)
  return xp
}

export const XP_QUIZ_RUNNING = 15
export const XP_QUIZ_TRUE = 10
export const XP_BET_ADVICE = 2

// --- levels -----------------------------------------------------------------

export interface LevelInfo {
  level: number
  title: string
  xp: number
  /** xp where this level began */
  floor: number
  /** xp needed for the next level, null at cap */
  ceiling: number | null
  /** 0..1 progress toward the next level */
  progress: number
}

const SKILL_LEVELS: { xp: number; title: string }[] = [
  { xp: 0, title: 'Novice' },
  { xp: 60, title: 'Apprentice' },
  { xp: 180, title: 'Competent' },
  { xp: 420, title: 'Sharp' },
  { xp: 900, title: 'Expert' },
  { xp: 1800, title: 'Master' },
]

const PLAYER_RANKS: { xp: number; title: string }[] = [
  { xp: 0, title: 'Tourist' },
  { xp: 300, title: 'Weekend Player' },
  { xp: 900, title: 'Regular' },
  { xp: 2000, title: 'Grinder' },
  { xp: 4000, title: 'Sharp' },
  { xp: 7000, title: 'Advantage Player' },
  { xp: 12000, title: 'Boss of the Pit' },
]

function levelFromTable(xp: number, table: { xp: number; title: string }[]): LevelInfo {
  let idx = 0
  for (let i = 0; i < table.length; i++) {
    if (xp >= table[i].xp) idx = i
  }
  const floor = table[idx].xp
  const ceiling = idx + 1 < table.length ? table[idx + 1].xp : null
  return {
    level: idx + 1,
    title: table[idx].title,
    xp,
    floor,
    ceiling,
    progress: ceiling === null ? 1 : (xp - floor) / (ceiling - floor),
  }
}

export function skillLevel(xp: number): LevelInfo {
  return levelFromTable(xp, SKILL_LEVELS)
}

export function playerRank(skillXp: Record<string, number>): LevelInfo {
  const total = Object.values(skillXp).reduce((s, x) => s + x, 0)
  return levelFromTable(total, PLAYER_RANKS)
}

// --- form (rolling accuracy) --------------------------------------------------

export interface SkillForm {
  seen: number
  windowSeen: number
  pct: number | null
  /** enough recent volume AND >= 90% — the skill is currently sharp */
  onForm: boolean
}

const FORM_WINDOW = 25
const FORM_MIN = 15

export function skillForm(stats: StatsState, skill: SkillId): SkillForm {
  const all = stats.decisions.filter((d) => !d.hinted && skillForDecision(d) === skill)
  const window = all.slice(-FORM_WINDOW)
  const correct = window.filter((d) => d.wasCorrect).length
  const pct = window.length ? Math.round((correct / window.length) * 100) : null
  return {
    seen: all.length,
    windowSeen: window.length,
    pct,
    onForm: window.length >= FORM_MIN && pct !== null && pct >= 90,
  }
}
