import type { TableRules } from '../engine/rules'
import { getTableTheme } from '../table/themes'

/**
 * The printed felt.
 *
 * A real blackjack table is not a coloured rectangle — it carries a layout: the
 * dealer's arc, the insurance line, and the house's terms printed where every
 * player can read them. That print is what makes felt read as a blackjack table.
 *
 * It occupies its own band between the dealer and the players, exactly where the
 * arc sits on a real table, so it can never collide with the cards.
 *
 * The legends are generated from the rules actually in play, never hard-coded. A
 * felt that reads "BLACKJACK PAYS 3 TO 2" while the engine deals 6:5 is the very
 * thing this app exists to inoculate against, so the print and the dealer read
 * from one source.
 *
 * Every mark here is generic table furniture common to the game. There are no
 * reproduced logos, wordmarks, or house artwork — each theme's centre device is
 * an original geometric figure.
 */

/** "3 TO 2" from 1.5, "6 TO 5" from 1.2 — as a real felt prints it. */
export function payoutLegend(payout: number): string {
  const known: Record<string, string> = {
    '1.5': '3 TO 2',
    '1.2': '6 TO 5',
    '2': '2 TO 1',
    '1': 'EVEN MONEY',
  }
  const exact = known[String(payout)]
  if (exact) return exact
  // Fall back to the smallest whole-number ratio rather than printing a decimal.
  for (let d = 2; d <= 20; d++) {
    const n = payout * d
    if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n)} TO ${d}`
  }
  return `${payout} TO 1`
}

export function dealerLegend(hitSoft17: boolean): string {
  return hitSoft17
    ? 'Dealer must draw to 16 and hit soft 17'
    : 'Dealer must draw to 16 and stand on all 17s'
}

/** Original centre devices — one per room, none derived from a real house mark. */
function CentreDevice({ id, color }: { id: string; color: string }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 1.4 }
  switch (id) {
    case 'bellagio': // ripples on water
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="8" />
          <circle cx="0" cy="0" r="14" />
          <circle cx="0" cy="0" r="20" />
        </g>
      )
    case 'wynn': // opening petals
      return (
        <g {...s}>
          {[0, 45, 90, 135].map((a) => (
            <ellipse key={a} cx="0" cy="0" rx="20" ry="7" transform={`rotate(${a})`} />
          ))}
        </g>
      )
    case 'cosmopolitan': // faceted jewel
      return (
        <g {...s}>
          <polygon points="0,-20 17,-7 11,16 -11,16 -17,-7" />
          <polygon points="0,-10 9,-3 6,9 -6,9 -9,-3" />
        </g>
      )
    case 'mgm': // radiating sunburst
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="8" />
          {Array.from({ length: 12 }, (_, i) => i * 30).map((a) => (
            <line key={a} x1="0" y1="-13" x2="0" y2="-20" transform={`rotate(${a})`} />
          ))}
        </g>
      )
    case 'mohegan': // woodland compass
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="18" />
          <polygon points="0,-18 5,0 0,18 -5,0" />
          <polygon points="-18,0 0,-5 18,0 0,5" />
        </g>
      )
    case 'caesars': // classical ring and key
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="19" />
          <path d="M-11,-6 h6 v12 h6 v-12 h6" />
        </g>
      )
    default: // card room — a plain pip rule
      return (
        <g {...s}>
          <circle cx="0" cy="0" r="17" />
          <path d="M0,-9 L7,0 L0,9 L-7,0 Z" />
        </g>
      )
  }
}

const W = 1000
const H = 250

export function TableLayout({ rules, themeId }: { rules: TableRules; themeId: string }) {
  const theme = getTableTheme(themeId)
  const line = theme.vars.line

  return (
    <div className="felt-print" aria-hidden="true">
      <svg
        className="felt-print__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        {/*
          Radii are chosen so the four curves peak at 105, 130, 185 and 205 —
          spaced far enough apart that the type never touches the line above it.
          Arcs open downward toward the players, the way a real felt prints.
        */}
        <defs>
          <path id="felt-arc-payout" d="M 130,150 A 700,298 0 0 1 870,150" />
          <path id="felt-arc-insurance" d="M 300,215 A 400,224 0 0 1 700,215" />
        </defs>

        <g transform="translate(500, 40) scale(1.35)" opacity="0.5">
          <CentreDevice id={theme.id} color={line} />
        </g>

        <text className="felt-print__payout" fill={line} opacity="0.62">
          <textPath href="#felt-arc-payout" startOffset="50%" textAnchor="middle">
            BLACKJACK PAYS {payoutLegend(rules.blackjackPayout)}
          </textPath>
        </text>

        {/* the dealer's arc */}
        <path
          d="M 70,205 A 800,478 0 0 1 930,205"
          stroke={line}
          strokeWidth="2.5"
          fill="none"
          opacity="0.45"
        />

        <text className="felt-print__insurance" fill={line} opacity="0.5">
          <textPath href="#felt-arc-insurance" startOffset="50%" textAnchor="middle">
            INSURANCE PAYS 2 TO 1
          </textPath>
        </text>

        {/* the insurance line the bets sit behind */}
        <path
          d="M 285,235 A 430,224 0 0 1 715,235"
          stroke={line}
          strokeWidth="1.25"
          fill="none"
          opacity="0.3"
        />
      </svg>

      <p className="felt-print__rule" style={{ color: line }}>
        {dealerLegend(rules.hitSoft17)}
        {rules.surrenderAllowed && ' · Late surrender offered'}
        {' · '}
        {rules.decks} decks · ${rules.tableMin}–${rules.tableMax}
      </p>
    </div>
  )
}
