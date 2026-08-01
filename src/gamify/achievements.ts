import type { StatsState } from '../stats/model'
import { deriveSessions } from '../stats/sessions'
import { skillForDecision } from './skills'

export interface AchievementMeta {
  id: string
  name: string
  glyph: string
  description: string
  /** shown while locked — how to earn it */
  hint: string
  check: (stats: StatsState) => boolean
}

const graded = (s: StatsState) => s.decisions.filter((d) => !d.hinted)

export const ACHIEVEMENTS: AchievementMeta[] = [
  {
    id: 'first-hand',
    name: 'Seat Taken',
    glyph: '🪑',
    description: 'Played your first hand.',
    hint: 'Play one hand.',
    check: (s) => s.handsPlayed >= 1,
  },
  {
    id: 'first-blackjack',
    name: 'Natural',
    glyph: '🂡',
    description: 'Dealt a natural blackjack.',
    hint: 'Land a two-card 21.',
    check: (s) => s.outcomes.some((o) => o.result === 'blackjack'),
  },
  {
    id: 'book-25',
    name: 'Student of the Book',
    glyph: '📖',
    description: '25 correct decisions.',
    hint: 'Make 25 correct plays.',
    check: (s) => graded(s).filter((d) => d.wasCorrect).length >= 25,
  },
  {
    id: 'book-250',
    name: 'The Book Is Reflex',
    glyph: '📚',
    description: '250 correct decisions.',
    hint: 'Make 250 correct plays.',
    check: (s) => graded(s).filter((d) => d.wasCorrect).length >= 250,
  },
  {
    id: 'streak-10',
    name: 'Ten Straight',
    glyph: '🔥',
    description: 'Ten correct decisions in a row.',
    hint: 'Hit a 10-decision streak.',
    check: (s) => s.streak.best >= 10,
  },
  {
    id: 'streak-25',
    name: 'Unshakeable',
    glyph: '💎',
    description: 'Twenty-five correct decisions in a row.',
    hint: 'Hit a 25-decision streak.',
    check: (s) => s.streak.best >= 25,
  },
  {
    id: 'split-8s-vs-ten',
    name: 'Courage Under Fire',
    glyph: '⚔️',
    description: 'Split 8s into a dealer 10 — the play everyone hates and the book demands.',
    hint: 'Correctly split 8,8 against a 10.',
    check: (s) =>
      graded(s).some((d) => d.keyStr === 'pair8' && d.up === '10' && d.chosen === 'split' && d.wasCorrect),
  },
  {
    id: 'doubles-20',
    name: 'Edge Presser',
    glyph: '⏫',
    description: '20 correct doubles.',
    hint: 'Double down correctly 20 times.',
    check: (s) => graded(s).filter((d) => d.chosen === 'double' && d.wasCorrect).length >= 20,
  },
  {
    id: 'insurance-iron',
    name: 'No Sale',
    glyph: '🚫',
    description: '10 correct insurance calls.',
    hint: 'Get 10 insurance decisions right.',
    check: (s) => graded(s).filter((d) => d.category === 'insurance' && d.wasCorrect).length >= 10,
  },
  {
    id: 'surrender-sense',
    name: 'Live to Bet Again',
    glyph: '🏳️',
    description: '5 correct surrenders.',
    hint: 'Surrender correctly 5 times (needs surrender enabled).',
    check: (s) => graded(s).filter((d) => d.chosen === 'surrender' && d.wasCorrect).length >= 5,
  },
  {
    id: 'drill-50',
    name: 'Boot Camp',
    glyph: '🎖️',
    description: '50 drilled decisions completed.',
    hint: 'Face 50 drill-mode decisions.',
    check: (s) => s.decisions.filter((d) => d.drilled).length >= 50,
  },
  {
    id: 'quiz-10',
    name: 'Human Abacus',
    glyph: '🧮',
    description: '10 running counts called exactly right.',
    hint: 'Nail 10 count quizzes.',
    check: (s) => s.countQuizzes.rcCorrect >= 10,
  },
  {
    id: 'deviation-5',
    name: 'Index Player',
    glyph: '🗂️',
    description: '5 correct count deviations.',
    hint: 'Play 5 deviations right in counting mode.',
    check: (s) =>
      graded(s).filter((d) => skillForDecision(d) === 'countplay' && d.category === 'deviation' && d.wasCorrect)
        .length >= 5,
  },
  {
    id: 'perfect-session',
    name: 'Flawless',
    glyph: '✨',
    description: 'A session of 20+ graded decisions without a single mistake.',
    hint: 'Finish a 20-decision session at 100%.',
    check: (s) => deriveSessions(s).some((x) => x.decisions >= 20 && x.pct === 100),
  },
  {
    id: 'comeback',
    name: 'The Comeback',
    glyph: '🌅',
    description: 'Climbed $200 off your session low.',
    hint: 'Recover $200 from a bankroll low.',
    check: (s) => {
      if (s.bankrollHistory.length < 2) return false
      let low = Infinity
      for (const v of s.bankrollHistory) {
        if (v < low) low = v
        if (v - low >= 200) return true
      }
      return false
    },
  },
  {
    id: 'speed-counter',
    name: 'Speed Counter',
    glyph: '⚡',
    description: 'Counted a drill correctly at 120+ cards per minute.',
    hint: 'Nail a speed drill at Fast tempo or quicker.',
    check: (s) => s.speedDrills.bestPace >= 120,
  },
  {
    id: 'hands-100',
    name: 'Shoe Leather',
    glyph: '👞',
    description: '100 hands played.',
    hint: 'Play 100 hands.',
    check: (s) => s.handsPlayed >= 100,
  },
]

/** Returns ids newly earned by `stats` that aren't in its unlocked set yet. */
export function evaluateAchievements(stats: StatsState): string[] {
  const out: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (stats.achievements[a.id]) continue
    if (a.check(stats)) out.push(a.id)
  }
  return out
}
