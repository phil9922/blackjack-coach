import type { StatsState } from './model'
import { emptyStats } from './model'

/**
 * All persistence is scoped to a user profile. A small registry tracks the
 * profiles and which one is active; stats and settings live under
 * per-profile keys. Data saved before profiles existed is migrated into the
 * first profile automatically.
 */
export interface Profile {
  id: string
  name: string
  createdAt: number
}

interface Registry {
  activeId: string
  profiles: Profile[]
}

const REGISTRY_KEY = 'bjt.profiles.v1'
const LEGACY_STATS_KEY = 'bjt.stats.v1'
const LEGACY_SETTINGS_KEY = 'bjt.settings.v1'

const statsKey = (id: string) => `bjt.stats.v1.${id}`
const settingsKey = (id: string) => `bjt.settings.v1.${id}`

function newProfile(name: string): Profile {
  return {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    createdAt: Date.now(),
  }
}

function saveRegistry(reg: Registry): void {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg))
  } catch {
    /* ignore */
  }
}

function loadRegistry(): Registry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.profiles) && parsed.profiles.length > 0 && parsed.activeId) {
        return parsed
      }
    }
  } catch {
    /* fall through to bootstrap */
  }
  // Bootstrap: first run, or a corrupt registry. Adopt any pre-profile data.
  const first = newProfile('Player 1')
  const reg: Registry = { activeId: first.id, profiles: [first] }
  try {
    const legacyStats = localStorage.getItem(LEGACY_STATS_KEY)
    if (legacyStats) {
      localStorage.setItem(statsKey(first.id), legacyStats)
      localStorage.removeItem(LEGACY_STATS_KEY)
    }
    const legacySettings = localStorage.getItem(LEGACY_SETTINGS_KEY)
    if (legacySettings) {
      localStorage.setItem(settingsKey(first.id), legacySettings)
      localStorage.removeItem(LEGACY_SETTINGS_KEY)
    }
  } catch {
    /* ignore */
  }
  saveRegistry(reg)
  return reg
}

export function getProfiles(): Profile[] {
  return loadRegistry().profiles
}

export function getActiveProfile(): Profile {
  const reg = loadRegistry()
  return reg.profiles.find((p) => p.id === reg.activeId) ?? reg.profiles[0]
}

/** Creates a profile and makes it active. */
export function createProfile(name: string): Profile {
  const reg = loadRegistry()
  const profile = newProfile(name.trim() || `Player ${reg.profiles.length + 1}`)
  saveRegistry({ activeId: profile.id, profiles: [...reg.profiles, profile] })
  return profile
}

export function switchProfile(id: string): void {
  const reg = loadRegistry()
  if (reg.profiles.some((p) => p.id === id)) {
    saveRegistry({ ...reg, activeId: id })
  }
}

export function renameProfile(id: string, name: string): void {
  const reg = loadRegistry()
  saveRegistry({
    ...reg,
    profiles: reg.profiles.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
  })
}

/** Deletes a profile and its data. Always leaves at least one profile. */
export function deleteProfile(id: string): void {
  const reg = loadRegistry()
  try {
    localStorage.removeItem(statsKey(id))
    localStorage.removeItem(settingsKey(id))
  } catch {
    /* ignore */
  }
  let profiles = reg.profiles.filter((p) => p.id !== id)
  if (profiles.length === 0) profiles = [newProfile('Player 1')]
  const activeId = reg.activeId === id ? profiles[0].id : reg.activeId
  saveRegistry({ activeId, profiles })
}

// --- per-profile stats ------------------------------------------------------

export function loadStats(): StatsState {
  try {
    const raw = localStorage.getItem(statsKey(getActiveProfile().id))
    if (!raw) return emptyStats()
    const parsed = JSON.parse(raw)
    if (parsed?.schemaVersion !== 1) return emptyStats()
    const empty = emptyStats()
    return {
      ...empty,
      ...parsed,
      // nested records need their own merge so saves from older versions
      // pick up newly added fields
      skillXp: { ...empty.skillXp, ...(parsed.skillXp ?? {}) },
      achievements: { ...empty.achievements, ...(parsed.achievements ?? {}) },
    }
  } catch {
    return emptyStats()
  }
}

export function saveStats(stats: StatsState): void {
  try {
    localStorage.setItem(statsKey(getActiveProfile().id), JSON.stringify(stats))
  } catch {
    // storage full or unavailable — training continues without persistence
  }
}

export function resetStats(): void {
  try {
    localStorage.removeItem(statsKey(getActiveProfile().id))
  } catch {
    /* ignore */
  }
}

// --- per-profile settings/config --------------------------------------------

export function loadPersisted<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(settingsKey(getActiveProfile().id))
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

/** Shallow-merges into the stored config so partial saves never drop fields. */
export function savePersisted<T extends object>(value: T): void {
  try {
    const key = settingsKey(getActiveProfile().id)
    const raw = localStorage.getItem(key)
    const existing = raw ? JSON.parse(raw) : {}
    localStorage.setItem(key, JSON.stringify({ ...existing, ...value }))
  } catch {
    /* ignore */
  }
}
