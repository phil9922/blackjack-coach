import type { TableRules } from '../engine/rules'

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
 * Every mark here is generic table furniture common to the game — no logos,
 * wordmarks or house artwork.
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

/** The house device — a plain pip rule at the head of the arc. */
function CentreDevice() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="0" cy="0" r="17" />
      <path d="M0,-9 L7,0 L0,9 L-7,0 Z" />
    </g>
  )
}

const W = 1000
const H = 250

export function TableLayout({ rules }: { rules: TableRules }) {
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
          <CentreDevice />
        </g>

        <text className="felt-print__payout" fill="currentColor" opacity="0.62">
          <textPath href="#felt-arc-payout" startOffset="50%" textAnchor="middle">
            BLACKJACK PAYS {payoutLegend(rules.blackjackPayout)}
          </textPath>
        </text>

        {/* the dealer's arc */}
        <path
          d="M 70,205 A 800,478 0 0 1 930,205"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.45"
        />

        <text className="felt-print__insurance" fill="currentColor" opacity="0.5">
          <textPath href="#felt-arc-insurance" startOffset="50%" textAnchor="middle">
            INSURANCE PAYS 2 TO 1
          </textPath>
        </text>

        {/* the insurance line the bets sit behind */}
        <path
          d="M 285,235 A 430,224 0 0 1 715,235"
          stroke="currentColor"
          strokeWidth="1.25"
          fill="none"
          opacity="0.3"
        />
      </svg>

      <p className="felt-print__rule">
        {dealerLegend(rules.hitSoft17)}
        {rules.surrenderAllowed && ' · Late surrender offered'}
        {' · '}
        {rules.decks} decks · ${rules.tableMin}–${rules.tableMax}
      </p>
    </div>
  )
}
