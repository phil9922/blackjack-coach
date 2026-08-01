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
Everything on the checklist is done except two deliberately-deferred extras: alternative counting
systems (~2h — deviation indices are Hi-Lo-specific, so a second system needs its own verified
indices or must disable deviation grading while selected) and cloud profile sync (~4h, needs a
backend, which the client-side-only design rules out for now). Nothing is blocking; the app is
complete. Next real work should come from actually using it at a table.

## Open questions
- Should drill mode also construct high-true-count scenarios to practice deviations (currently it
  drills basic-strategy cells only)?
- Are cloud-synced profiles wanted eventually? Current profiles are per-browser localStorage.
