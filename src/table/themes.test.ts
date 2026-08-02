import { describe, expect, it } from 'vitest'
import {
  TABLE_THEMES,
  DEFAULT_TABLE_THEME,
  getTableTheme,
  tableThemeStyle,
  type TableThemeVars,
} from './themes'
import { DEFAULT_SETTINGS } from '../engine/game'

const TOKENS: (keyof TableThemeVars)[] = [
  'felt',
  'feltDeep',
  'railWood',
  'railWoodHi',
  'accent',
  'accentDeep',
  'cardBack',
  'cardBackAlt',
  'line',
]

describe('table themes', () => {
  it('every theme defines every token as a hex colour', () => {
    for (const theme of TABLE_THEMES) {
      for (const token of TOKENS) {
        expect(theme.vars[token], `${theme.id}.${token}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('ids and names are unique', () => {
    expect(new Set(TABLE_THEMES.map((t) => t.id)).size).toBe(TABLE_THEMES.length)
    expect(new Set(TABLE_THEMES.map((t) => t.name)).size).toBe(TABLE_THEMES.length)
  })

  it('every theme is described, so the picker never shows a blank note', () => {
    for (const theme of TABLE_THEMES) {
      expect(theme.name.trim().length, theme.id).toBeGreaterThan(0)
      expect(theme.note.trim().length, theme.id).toBeGreaterThan(0)
    }
  })

  it('the default theme exists and is what a fresh profile gets', () => {
    expect(TABLE_THEMES.some((t) => t.id === DEFAULT_TABLE_THEME)).toBe(true)
    expect(DEFAULT_SETTINGS.tableTheme).toBe(DEFAULT_TABLE_THEME)
  })

  it('an unknown id falls back to the default rather than rendering an unstyled table', () => {
    // Saved settings can name a theme that a later version removed.
    expect(getTableTheme('a-room-that-closed').id).toBe(TABLE_THEMES[0].id)
    expect(getTableTheme('').id).toBe(TABLE_THEMES[0].id)
  })

  it('emits the custom properties the stylesheet actually consumes', () => {
    const style = tableThemeStyle('mgm')
    expect(Object.keys(style).sort()).toEqual(
      [
        '--accent',
        '--accent-deep',
        '--card-back',
        '--card-back-alt',
        '--felt',
        '--felt-deep',
        '--felt-print',
        '--rail-wood',
        '--rail-wood-hi',
      ].sort()
    )
    expect(style['--felt']).toBe(getTableTheme('mgm').vars.felt)
  })

  it('the print stays legible against its own felt', () => {
    // Crude relative luminance is enough to catch a print colour that would
    // disappear into the baize.
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    for (const theme of TABLE_THEMES) {
      const gap = lum(theme.vars.line) - lum(theme.vars.felt)
      expect(gap, `${theme.id}: print vs felt`).toBeGreaterThan(0.4)
    }
  })

  it('card backs are distinct from their own felt, or the hole card vanishes', () => {
    for (const theme of TABLE_THEMES) {
      expect(theme.vars.cardBack, theme.id).not.toBe(theme.vars.felt)
      expect(theme.vars.cardBack, theme.id).not.toBe(theme.vars.feltDeep)
    }
  })
})
