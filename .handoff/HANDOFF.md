# Handoff

## Current focus
The app is feature-complete and committed (4 commits on `main`): a React+Vite+TS blackjack trainer
that grades every decision against H17/6D/DAS basic strategy with explanations, hint button, bet
advisor, AI table-mates, Hi-Lo counting mode (deviations + quizzes), stats with outcome-loss trends,
a coaching engine, drill mode that targets the user's weak spots, gamification (7 skill tracks, XP,
ranks, 16 badges), and multiple user profiles with per-profile bankrolls. 144 unit tests + Playwright
E2E passes all green.

## Blockers
None. Note: port 5173 is occupied by an unrelated app on this machine — always run
`npm run dev -- --port 5199 --strictPort` and point tests at :5199.

## Next step
All P0s and P1s are done. Only P2 extras remain — the most useful is probably the count
speed-drill mini-game (~1.5h) or "even money" wording for blackjack vs a dealer ace (~30m).
Nothing is blocking; the app is complete and usable as-is.

## Open questions
- Should drill mode also construct high-true-count scenarios to practice deviations (currently it
  drills basic-strategy cells only)?
- Are cloud-synced profiles wanted eventually? Current profiles are per-browser localStorage.
