import { beforeEach, describe, expect, it } from 'vitest'
import { emptyStats } from '../stats/model'
import type { DecisionRecord, HandOutcomeRecord } from '../stats/model'
import { buildDigest, hasEnoughHistory } from './summary'
import { saveApiKey, loadApiKey, exportProfile, getActiveProfile, saveStats, savePersisted } from '../stats/storage'

function decision(over: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    t: 1000, mode: 'basic', keyStr: 'hard16', keyLabel: 'hard 16', up: '10',
    chosen: 'hit', correct: 'hit', wasCorrect: true,
    category: 'hard', source: 'basic', hinted: false, ...over,
  }
}

function outcome(over: Partial<HandOutcomeRecord> = {}): HandOutcomeRecord {
  return {
    t: 1000, mode: 'basic', startKeyStr: 'hard16', startLabel: 'hard 16', up: '10',
    result: 'lose', net: -15, bet: 15, wasSplitHand: false, ...over,
  }
}

describe('hasEnoughHistory', () => {
  it('needs 20 unassisted decisions before the coach can say anything', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 19 }, () => decision())
    expect(hasEnoughHistory(stats)).toBe(false)
    stats.decisions.push(decision())
    expect(hasEnoughHistory(stats)).toBe(true)
  })

  it('hinted plays do not count toward the threshold', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 30 }, () => decision({ hinted: true }))
    expect(hasEnoughHistory(stats)).toBe(false)
  })
})

describe('buildDigest', () => {
  it('summarizes without shipping raw hand history', () => {
    const stats = emptyStats()
    stats.handsPlayed = 40
    stats.streak = { current: 3, best: 11 }
    stats.decisions = [
      ...Array.from({ length: 6 }, () =>
        decision({ chosen: 'hit', correct: 'surrender', wasCorrect: false, category: 'surrender' })
      ),
      ...Array.from({ length: 20 }, () => decision()),
    ]
    stats.outcomes = Array.from({ length: 12 }, () => outcome())
    stats.skillXp = { hard: 250 }

    const digest = buildDigest(stats, { mode: 'basic', bankroll: 420, totalBuyIn: 500 })

    expect(digest.handsPlayed).toBe(40)
    expect(digest.bankroll).toEqual({ current: 420, totalBuyIn: 500, net: -80 })
    expect(digest.streak).toEqual({ current: 3, best: 11 })
    expect(digest.topMistakes[0]).toMatchObject({
      spot: 'hard 16 vs 10',
      theyDid: 'hit',
      bookSays: 'surrender',
    })
    expect(digest.skills.some((s) => s.name === 'Hard Hands')).toBe(true)

    // the payload is derived numbers only — no per-hand records ride along
    const json = JSON.stringify(digest)
    expect(json).not.toContain('"t":')
    expect(json).not.toContain('wasSplitHand')
    expect(json.length).toBeLessThan(8000)
  })

  it('stays small even with a full decision buffer', () => {
    const stats = emptyStats()
    stats.decisions = Array.from({ length: 1000 }, (_, i) =>
      decision({ t: 1000 + i, wasCorrect: i % 3 !== 0 })
    )
    stats.outcomes = Array.from({ length: 2000 }, () => outcome())
    const json = JSON.stringify(buildDigest(stats, { mode: 'counting', bankroll: 900, totalBuyIn: 500 }))
    expect(json.length).toBeLessThan(12000)
  })
})

describe('API key storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    ;(globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    }
  })

  it('round-trips and clears', () => {
    saveApiKey('sk-ant-secret')
    expect(loadApiKey()).toBe('sk-ant-secret')
    saveApiKey('')
    expect(loadApiKey()).toBe('')
  })

  it('is NEVER included in a profile export', () => {
    saveApiKey('sk-ant-secret')
    saveStats({ ...emptyStats(), handsPlayed: 5 })
    savePersisted({ buyIn: 500 })
    const exported = JSON.stringify(exportProfile(getActiveProfile().id))
    expect(exported).not.toContain('sk-ant-secret')
    expect(exported).toContain('handsPlayed')
  })
})
