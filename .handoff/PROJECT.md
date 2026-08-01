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
  without a graded verdict and explanation.

## Constraints
- Training targets **real casino trips**: rules realism is load-bearing (6D, H17, DAS, no surrender
  by default, 3:2 — the common Vegas shoe game). Don't add fantasy rules that would train wrong
  instincts.
- Client-side only; all persistence is per-profile localStorage. Cloud sync would need a backend
  and is explicitly future work.
- Dev server must run on port 5199 (`--strictPort`) — 5173 is occupied by another app on this machine.

## Definition of done
Current milestone is done when the app **runs well on a phone**: the table, verdict rail, modals,
and Stats/Progress/Skills screens usable at ~375–430px widths with no horizontal page scroll and
tap-friendly controls. Feature set is otherwise complete.

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
