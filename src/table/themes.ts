/**
 * Table themes — the room you're sitting in.
 *
 * Each theme is an original palette evoking the colour language of a well-known
 * casino floor: its felt, its rail, and the metal it trims everything with.
 * They carry no logos, marks, or reproduced artwork, and the names live here in
 * one place so they can be changed in a single edit.
 *
 * These are COSMETIC ONLY. Real rooms differ on rules that matter enormously —
 * a 6:5 blackjack payout costs more than every counting edge combined — and
 * quietly attaching a rule set to a colour scheme would teach the wrong game.
 * Rules stay under the player's control in Settings, independent of the theme.
 */

export interface TableThemeVars {
  /** felt at the top of the table gradient */
  felt: string
  /** felt at the bottom of the gradient */
  feltDeep: string
  /** the rail (header bar) */
  railWood: string
  /** rail highlight, used for the underline and seat trim */
  railWoodHi: string
  /** the metal: active seat, chips, rank chip, bankroll */
  accent: string
  /** the same metal, darkened, for text on paper */
  accentDeep: string
  /** card back stripes — must read clearly against the felt */
  cardBack: string
  cardBackAlt: string
  /** the colour the table layout is screen-printed in */
  line: string
}

export interface TableTheme {
  id: string
  name: string
  /** one line on what the palette is drawn from, shown in Settings */
  note: string
  vars: TableThemeVars
}

export const TABLE_THEMES: TableTheme[] = [
  {
    id: 'cardroom',
    name: 'Card Room',
    note: 'The house table — baize green, dark wood, brass.',
    vars: {
      felt: '#1e4d3a',
      feltDeep: '#123528',
      railWood: '#241c14',
      railWoodHi: '#3a2d1f',
      accent: '#c9a227',
      accentDeep: '#97781a',
      cardBack: '#6e2231',
      cardBackAlt: '#5a1b28',
      line: '#e8dfc4',
    },
  },
  {
    id: 'bellagio',
    name: 'Bellagio',
    note: 'Lake Como blue and soft gold, under the glass ceiling.',
    vars: {
      felt: '#1b3f61',
      feltDeep: '#0e2743',
      railWood: '#1a1f2b',
      railWoodHi: '#2d3646',
      accent: '#d6b660',
      accentDeep: '#9b8234',
      cardBack: '#7d2b33',
      cardBackAlt: '#631f27',
      line: '#e6d8a8',
    },
  },
  {
    id: 'wynn',
    name: 'Wynn',
    note: 'Wine-red felt, walnut, and copper — warm and residential.',
    vars: {
      felt: '#5c2130',
      feltDeep: '#3c1420',
      railWood: '#2b1a13',
      railWoodHi: '#48291c',
      accent: '#dda263',
      accentDeep: '#a6713a',
      cardBack: '#22405e',
      cardBackAlt: '#182f49',
      line: '#f0d9bc',
    },
  },
  {
    id: 'cosmopolitan',
    name: 'The Cosmopolitan',
    note: 'Charcoal and plum with neon magenta — the jewel box.',
    vars: {
      felt: '#2c2439',
      feltDeep: '#191424',
      railWood: '#141119',
      railWoodHi: '#2b2537',
      accent: '#e35d9f',
      accentDeep: '#a83a72',
      cardBack: '#1f5f6b',
      cardBackAlt: '#154751',
      line: '#f2c2dc',
    },
  },
  {
    id: 'mgm',
    name: 'MGM Grand',
    note: 'Emerald and bright gold on black lacquer.',
    vars: {
      felt: '#115139',
      feltDeep: '#07321f',
      railWood: '#101010',
      railWoodHi: '#282828',
      accent: '#e2bf4b',
      accentDeep: '#a5862b',
      cardBack: '#6e2231',
      cardBackAlt: '#5a1b28',
      line: '#f2e2a4',
    },
  },
  {
    id: 'mohegan',
    name: 'Mohegan Sun',
    note: 'Woodland teal, timber, and autumn amber.',
    vars: {
      felt: '#12504e',
      feltDeep: '#083130',
      railWood: '#382915',
      railWoodHi: '#553f1f',
      accent: '#e39d3f',
      accentDeep: '#a76d23',
      cardBack: '#7c3a20',
      cardBackAlt: '#5f2c17',
      line: '#f2d9a8',
    },
  },
  {
    id: 'caesars',
    name: 'Caesars Palace',
    note: 'Imperial purple and marble gold.',
    vars: {
      felt: '#3a2251',
      feltDeep: '#231334',
      railWood: '#1b1524',
      railWoodHi: '#332741',
      accent: '#dcc37e',
      accentDeep: '#a18d48',
      cardBack: '#6e2231',
      cardBackAlt: '#5a1b28',
      line: '#ece0b8',
    },
  },
]

export type TableThemeId = (typeof TABLE_THEMES)[number]['id']

export const DEFAULT_TABLE_THEME = 'cardroom'

export function getTableTheme(id: string): TableTheme {
  return TABLE_THEMES.find((t) => t.id === id) ?? TABLE_THEMES[0]
}

/**
 * The theme as inline CSS custom properties. Set on the app root so the rail,
 * the felt and the cards all move together — a theme is a room, not a tablecloth.
 */
export function tableThemeStyle(id: string): Record<string, string> {
  const { vars } = getTableTheme(id)
  return {
    '--felt': vars.felt,
    '--felt-deep': vars.feltDeep,
    '--rail-wood': vars.railWood,
    '--rail-wood-hi': vars.railWoodHi,
    '--accent': vars.accent,
    '--accent-deep': vars.accentDeep,
    '--card-back': vars.cardBack,
    '--card-back-alt': vars.cardBackAlt,
    '--felt-print': vars.line,
  }
}
