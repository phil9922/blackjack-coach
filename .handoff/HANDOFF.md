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
All P0s and P1s are done, plus most P2s. Only two extras remain: alternative counting systems
(~2h — note deviation indices are Hi-Lo-specific, so a second system needs its own verified
indices or must disable deviation grading) and sound effects (~1h). Nothing is blocking.

## Open questions
- Should drill mode also construct high-true-count scenarios to practice deviations (currently it
  drills basic-strategy cells only)?
- Are cloud-synced profiles wanted eventually? Current profiles are per-browser localStorage.
