import { beforeEach, describe, expect, it } from 'vitest'
import {
  getProfiles,
  getActiveProfile,
  createProfile,
  createProfileWithRules,
  switchProfile,
  renameProfile,
  deleteProfile,
  exportProfile,
  importProfile,
  loadStats,
  saveStats,
  loadPersisted,
  savePersisted,
} from './storage'
import { emptyStats } from './model'
import { DEFAULT_RULES, type TableRules } from '../engine/rules'
import type { AiSeatConfig, Settings } from '../engine/game'

// Minimal localStorage for the node test environment.
function installFakeStorage() {
  const store = new Map<string, string>()
  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
  return store
}

let store: Map<string, string>

beforeEach(() => {
  store = installFakeStorage()
})

describe('profile registry', () => {
  it('bootstraps a first profile on a fresh browser', () => {
    const profiles = getProfiles()
    expect(profiles).toHaveLength(1)
    expect(profiles[0].name).toBe('Player 1')
    expect(getActiveProfile().id).toBe(profiles[0].id)
  })

  it('migrates pre-profile data into the first profile', () => {
    const legacy = { ...emptyStats(), handsPlayed: 42 }
    store.set('bjt.stats.v1', JSON.stringify(legacy))
    store.set('bjt.settings.v1', JSON.stringify({ buyIn: 750 }))

    expect(loadStats().handsPlayed).toBe(42)
    expect(loadPersisted({ buyIn: 500 }).buyIn).toBe(750)
    expect(store.has('bjt.stats.v1')).toBe(false) // legacy keys consumed
  })

  it('create switches active; each profile has isolated stats', () => {
    saveStats({ ...emptyStats(), handsPlayed: 10 })
    const first = getActiveProfile()
    const second = createProfile('Dana')
    expect(getActiveProfile().id).toBe(second.id)
    expect(loadStats().handsPlayed).toBe(0) // fresh profile, fresh stats

    saveStats({ ...emptyStats(), handsPlayed: 3 })
    switchProfile(first.id)
    expect(loadStats().handsPlayed).toBe(10) // original untouched
    switchProfile(second.id)
    expect(loadStats().handsPlayed).toBe(3)
  })

  it('settings are per-profile too', () => {
    savePersisted({ buyIn: 900 })
    createProfile('Fresh')
    expect(loadPersisted({ buyIn: 500 }).buyIn).toBe(500)
  })

  it('savePersisted merges instead of clobbering other fields', () => {
    savePersisted({ buyIn: 900 })
    savePersisted({ bankroll: 640 })
    const loaded = loadPersisted<{ buyIn: number; bankroll?: number }>({ buyIn: 500 })
    expect(loaded.buyIn).toBe(900)
    expect(loaded.bankroll).toBe(640)
  })

  it('creates a profile with chosen table rules, not the defaults', () => {
    const second = createProfileWithRules('High roller', {
      tableMin: 100,
      tableMax: 5000,
      decks: 2,
      surrenderAllowed: true,
    })
    expect(getActiveProfile().id).toBe(second.id)
    const loaded = loadPersisted<{ rules: TableRules }>({ rules: DEFAULT_RULES })
    expect(loaded.rules).toMatchObject({
      tableMin: 100,
      tableMax: 5000,
      decks: 2,
      surrenderAllowed: true,
    })
    // Untouched fields still come from DEFAULT_RULES.
    expect(loaded.rules.hitSoft17).toBe(DEFAULT_RULES.hitSoft17)
  })

  it('creates a profile with the AI seats chosen at setup', () => {
    const seats: AiSeatConfig[] = [{ name: 'Marge', profileId: 'book' }]
    createProfileWithRules(
      'Not Alone',
      { tableMin: 25, tableMax: 1000, decks: 6, surrenderAllowed: false },
      seats
    )
    const loaded = loadPersisted<{ settings: Pick<Settings, 'aiSeats'> }>({
      settings: { aiSeats: [] },
    })
    expect(loaded.settings.aiSeats).toEqual(seats)
  })

  it('defaults to an empty table when no AI seats are chosen', () => {
    createProfileWithRules('Solo', { tableMin: 25, tableMax: 1000, decks: 6, surrenderAllowed: false })
    const loaded = loadPersisted<{ settings: Pick<Settings, 'aiSeats'> }>({
      settings: { aiSeats: [] },
    })
    expect(loaded.settings.aiSeats).toEqual([])
  })

  it('rename keeps id and data', () => {
    const p = getActiveProfile()
    saveStats({ ...emptyStats(), handsPlayed: 7 })
    renameProfile(p.id, 'Lucky')
    expect(getActiveProfile()).toMatchObject({ id: p.id, name: 'Lucky' })
    expect(loadStats().handsPlayed).toBe(7)
  })

  it('delete removes data and re-activates another profile', () => {
    const first = getActiveProfile()
    saveStats({ ...emptyStats(), handsPlayed: 99 })
    const second = createProfile('Temp')
    switchProfile(first.id)
    deleteProfile(first.id)
    expect(getActiveProfile().id).toBe(second.id)
    expect(getProfiles()).toHaveLength(1)
    expect([...store.keys()].some((k) => k.includes(first.id))).toBe(false)
  })

  it('deleting the last profile leaves a fresh one', () => {
    const only = getActiveProfile()
    deleteProfile(only.id)
    const profiles = getProfiles()
    expect(profiles).toHaveLength(1)
    expect(profiles[0].id).not.toBe(only.id)
  })

  it('export/import round-trips a profile into a new browser', () => {
    saveStats({ ...emptyStats(), handsPlayed: 55 })
    savePersisted({ buyIn: 800 })
    const exported = exportProfile(getActiveProfile().id)!
    expect(exported.format).toBe('bjt-profile')

    // simulate a different browser: wipe everything, then import
    store.clear()
    const imported = importProfile(JSON.parse(JSON.stringify(exported)))
    expect(imported?.name).toBe('Player 1')
    expect(getActiveProfile().id).toBe(imported!.id)
    expect(loadStats().handsPlayed).toBe(55)
    expect(loadPersisted({ buyIn: 500 }).buyIn).toBe(800)
  })

  it('import rejects malformed files', () => {
    expect(importProfile({ hello: 'world' })).toBe(null)
    expect(importProfile(null)).toBe(null)
    expect(getProfiles()).toHaveLength(1) // no junk profile created
  })
})
