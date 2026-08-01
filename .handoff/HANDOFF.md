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
Per PROJECT.md, the milestone is done when the app runs well on a phone: do the mobile QA sweep at
375–430px (top P0). Second P0: verify the Illustrious 18 / Fab 4 deviation indices in
`src/strategy/deviations.ts` against an H17-specific published reference — chart correctness is a
must-never-break invariant and the training targets real casino play.

## Open questions
- Should drill mode also construct high-true-count scenarios to practice deviations (currently it
  drills basic-strategy cells only)?
- Are cloud-synced profiles wanted eventually? Current profiles are per-browser localStorage.
