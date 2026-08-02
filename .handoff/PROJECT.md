# Project

## What this is
A blackjack trainer that plays like a real casino game but grades every decision against basic
strategy (and count deviations) with explanations, learns the player's weaknesses, drills them,
and gamifies mastery across seven skills.

## Who it's for
The owner personally today — but built as a **possible future product**, so code quality, design,
and data-safety decisions should hold up to public users, not just personal tolerance.

## Must never break
- **Strategy chart correctness** — a wrong cell silently teaches wrong blackjack, the worst failure
  a trainer can have. The chart is locked by an exhaustive test against an independently transcribed
  Wizard of Odds H17 reference (`src/strategy/__fixtures__/`); never edit chart or deviations
  without updating/passing those tests.
- **Saved progress and profiles** — stats, XP, badges, and bankrolls must survive app updates.
  New fields need defaults merged in `storage.ts` loaders; never change storage keys without a
  migration (see the legacy→profile migration as the pattern).
- **Honest shoe and count** — every deal, including drill-stacked ones, comes from a real 312-card
  shoe (drill uses rank-swaps, never conjured cards) and the hole card is only counted at reveal.
  Breaking this makes counting practice worthless at a real table.
- **Every decision graded** — no action path (splits, doubles, insurance, surrender) may resolve
  without a graded verdict and explanation. Rewind is the one path that replays a decision, and it
  keeps the original grade on the record: the replay is graded and explained but marked `replayed`
  and skipped by `recordDecision`, so taking a move back can never buy back accuracy.
- **The felt must not lie** — the printed table legends (`BLACKJACK PAYS …`, the soft-17 line, deck
  count, limits) are generated from the live `TableRules`, never hard-coded. A table advertising 3:2
  while the engine deals 6:5 is the exact trap this app exists to inoculate against.

## Constraints
- Training targets **real casino trips**: rules realism is load-bearing (6D, H17, DAS, no surrender
  by default, 3:2 — the common Vegas shoe game). Don't add fantasy rules that would train wrong
  instincts.
- Client-side only; all persistence is per-profile localStorage. Cloud sync would need a backend
  and is explicitly future work.
- **The app works fully offline.** The AI coach is the single exception and is opt-in, needs the
  user's own API key, and only fires on an explicit button press. Never make a network call a
  precondition for training.
- **Dev server is pinned to port 5175** in `vite.config.ts` with `strictPort: true` — plain
  `npm run dev` is correct, no flags. This is not a preference: `localStorage` is partitioned by
  origin *including the port*, so a wandering dev server silently strands every saved profile behind
  an address the player has no reason to revisit. A collision must fail loudly, never relocate.

## Definition of done
The previous milestone — **runs well on a phone**, usable at ~375–430px with no horizontal scroll —
was met on 2026-08-01. The current milestone is **published**: the repo is public on GitHub as
`blackjack-coach` with a license, description, and topics set, and the README stands on its own for
someone who has never seen it. Feature set is complete; further work should come from actually
using it at a table.

## Decisions
- 2026-08-01 — TypeScript + exhaustive double-transcription chart tests, because chart correctness
  is the product.
- 2026-08-01 — Wrong moves play out with consequences (grade recorded, optional pause) rather than
  being blocked, so the user feels the cost.
- 2026-08-01 — Drill mode rigs the shuffle instead of conjuring cards, to keep the shoe and count
  honest.
- 2026-08-01 — Hinted plays earn token XP and are excluded from accuracy/streaks, so hints teach
  without inflating stats.
- 2026-08-01 — Profiles switch via full page reload for clean re-initialization; simplicity over
  seamlessness.
- 2026-08-01 — Repo named `blackjack-coach`, with "AI" deliberately kept out of the name despite
  being a real feature. A repo name is permanent in a way a description isn't (renaming costs links
  and stars), "AI" is the most crowded namespace on GitHub rather than a differentiator, and the AI
  layer is optional while the verified chart is the actual moat. AI stays prominent in the
  description and topics, which is what search matches anyway.
- 2026-08-01 — The AI coach *supplements* the rule-based coach rather than replacing it: the
  deterministic engine still detects tendencies and drives drill mode offline, and the LLM read is
  an extra lens. The API key is stored outside per-profile data specifically so profile
  export/import can never leak it.
- 2026-08-01 — Deviation indices follow Blackjack Apprenticeship's H17 chart as primary authority
  (it's what real students study), with Wong's Professional Blackjack filling plays BJA omits.
  Where they disagree by a point (12v3, 16v9), BJA wins. Stand deviations on 15/16 vs 9/10 are
  skipped when surrender is available — surrender stays the better play.
- 2026-08-01 — A counting system without a verified index set ships with deviation grading OFF and
  says so in the UI, rather than borrowing Hi-Lo's indices. An index number belongs to the system it
  was computed for; reusing one would silently teach a wrong play, which is the failure this project
  exists to prevent. `supportsDeviations` in `src/counting/systems.ts` is that switch.
- 2026-08-01 — Tests that cost money are opt-in and never part of `npm test`. Loading `.env` into
  the Vitest environment silently turned every `npm test` into four billed API calls; the live coach
  check now needs `COACH_LIVE=1` (via `npm run test:coach`) on top of a key. The offline guarantee
  covers the test suite, not just the app.
- 2026-08-01 — No hosting. The app is built locally (`npm run build` + `npm run preview`) and not
  deployed anywhere. The repo is private and the app is single-player and client-only, so a public
  URL would add an attack surface and a maintenance burden for no benefit. Revisit only if the repo
  goes public.
- 2026-08-02 — Casino-branded table themes were built and then removed before publishing. The
  palettes and centre devices were original, but the room names were other companies' trademarks
  shown in Settings and the README, and this repo goes out under the owner's name. Removed the whole
  system rather than renaming: a picker with one option is dead UI, and the printed felt — the part
  that actually made it look like a table — is independent of it.
- 2026-08-02 — Rewind keeps the grade. Taking a decision back restores the shoe, count and bets
  exactly, but the original grade stays on the record and the replay is excluded from stats. A
  rewind buys the lesson, never the accuracy; anything else would let the trainer be gamed into
  flattering numbers, which is the failure this project exists to prevent.
- 2026-08-02 — The dev server port is configuration, not preference. `localStorage` is partitioned
  by origin *including the port*, so a dev server free to wander silently strands saved profiles.
  Pinned to 5175 with `strictPort` so a collision fails loudly instead of relocating the app.
