# Checklist

## P0 — Required to work
- [x] [10m] Add a LICENSE file (MIT unless the owner prefers otherwise) — without one a public repo is all-rights-reserved and nobody can legally use or fork it
- [x] [1h] Mobile layout QA sweep at 375–430px widths (table, rail, modals, Skills/Progress tables) and fix overflow issues found — milestone's definition of done
- [x] [45m] Verify Illustrious 18 / Fab 4 indices in `src/strategy/deviations.ts` against an H17-specific reference (e.g. current BJA/Schlesinger H17 tables); adjust thresholds + boundary tests to match — chart correctness is a must-never-break invariant and training targets real casino play

## P1 — Good ideas
- [x] [20m] Create the GitHub repo as `blackjack-coach` and push (created **private** at the owner's request). Description: "Blackjack basic strategy and card counting trainer — grades every decision, explains why, drills the hands you keep getting wrong, and finds patterns in your play with AI coaching." Topics: `blackjack`, `blackjack-strategy`, `basic-strategy`, `card-counting`, `hi-lo`, `blackjack-trainer`, `ai`, `ai-coach`, `llm`, `claude-api`, `react`, `typescript`
- [x] [15m] Verify the AI coach's real output quality — done against the live API over four runs. Quality is strong and needed no prompt changes; the three failures were all miscalibrated assertions. Re-run any time with `npm run test:coach`
- [x] [1.5h] Drill mode for deviations: construct high/low-true-count drill scenarios in counting mode so index plays get practiced, not just encountered
- [x] [45m] Profile export/import (JSON download/upload) so a profile can move between browsers
- [x] [45m] Hole-card flip animation and win/loss chip payout animation (respecting prefers-reduced-motion)

- [x] [30m] Add a CI workflow — done 2026-08-12. `.github/workflows/ci.yml` runs `npm test` + `npm run build` on push to `main` and on every PR, matrixed over Node 18 (the README's floor) and 20. No API key is set and the live coach check also needs `COACH_LIVE=1`, so CI cannot bill a call
- [ ] [5m] Upload `img/header-banner.png` as the social preview in **Settings → General → Social preview** — it's committed for exactly this and now renders in links and search, but it can only be set by hand; the API won't do it

## P2 — Extras
- [x] [2h] Double-transcribe the KO key count / pivot in `src/counting/systems.ts` against an independent second source and add fixture coverage — done: `src/counting/__fixtures__/ko-reference.ts` + `ko-reference.test.ts`, 28 tests. Found and fixed a real gap: the published 4-deck key count (-1) was missing from the table, so `koKeyCount(4)` resolved to the six-deck -4. Tags, IRC, key counts and pivot otherwise all checked out
- [ ] [3h, BLOCKED on a source] Ship verified Hi-Opt I deviation index sets so index plays grade there too — needs Humble & Cooper ch. 8 plus the H17 modifications on p. 263 as text or a legible photo. Researched 2026-08-08: no open-web source clears the two-source bar and the free reproductions contradict each other on 16 v 10. Don't re-research it; `docs/index-set-sourcing.md` records what was checked and why each fails. With the tables in hand it is a fixture, a test and one flag
- [ ] [6h, BLOCKED on a source] Same for KO — needs the KO Preferred matrix from *Knock-Out Blackjack*. Bigger than Hi-Opt I because it is not data-only: KO's indices are running counts that vary by shoe size, while `findDeviation` takes a true count and `currentTrueCount` returns 0 for unbalanced systems, so the grading path has to change too
- [ ] [3d] Alternative to both of the above: derive index sets in-repo with an exact combinatorial EV engine, validated by reproducing the already-locked Hi-Lo Illustrious 18 and Fab 4 cell for cell. Self-verifying, needs no book, and would let the app grade any counting system — but it is a project, not an afternoon
- [x] [30m] Offer "even money" wording when the player has blackjack vs a dealer ace (currently shows the generic insurance prompt)
- [x] [2h] Additional counting systems (KO, Hi-Opt I) selectable in settings, with matching true-count handling — shipped with deviation grading disabled for the non-Hi-Lo systems, per the constraint
- [x] [1.5h] Count speed-drill mini-game: flash a stream of cards, answer the running count at the end
- [x] [1h] Sound effects for deal/verdict/level-up with a mute toggle
- [ ] [4h] Cloud sync for profiles (needs a backend — out of scope for localStorage-only design)
- [x] [20m] Scrub old `.handoff/.state.json` blobs from git history — done 2026-08-12 with `git filter-branch --index-filter --prune-empty`, verified by walking every commit tree on `main`. Rewrote every hash from `022268a` on and dropped one commit that held nothing else; `LOG.md` citations were remapped and all resolve
- [x] [5m] Flip the repo to public — done 2026-08-12. Re-verified first: 275 tests green, `npm run build` clean, no key-shaped string anywhere in history or in `dist/` (the `sk-ant-` hits are the settings placeholder and an error message). `.handoff/.state.json` was untracked and gitignored on the way out; the four `.handoff/*.md` files stay tracked as the project's engineering log
- [ ] [20m] Recapture `docs/coach.png` and `docs/skills.png` from a real played-in profile — needs a `Settings → Export` file from the owner's browser; the import-and-capture script is written and tested
- [ ] [30m] Decide whether `liveCoach` should default to off now that the rail can ask on demand — every ~8 hands it bills a call that the prompt tells it to answer with silence
- [ ] [30m] Bottom padding on `.seats` so they can scroll clear of the sticky dock on short windows (currently the dock occludes them at some scroll positions)
