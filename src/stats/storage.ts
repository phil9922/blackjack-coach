import type { StatsState } from './model'
import { emptyStats } from './model'

const KEY = 'bjt.stats.v1'
const SETTINGS_KEY = 'bjt.settings.v1'

export function loadStats(): StatsState {
  try {
    const raw = localStorage.getItem(KEY)
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
    localStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    // storage full or unavailable — training continues without persistence
  }
}

export function resetStats(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function loadPersisted<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

export function savePersisted<T>(value: T): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
