# Handoff

## Current focus
Preparing to publish as a public GitHub repo named **`blackjack-coach`**. The app itself is
feature-complete: React + Vite + TS, grades every decision against a verified H17/6D/DAS chart with
explanations, hint button, bet advisor, AI table-mates, Hi-Lo counting mode (20 verified deviation
indices + quizzes + speed drill), stats with outcome-vs-expectation trends, an 11-rule coaching
engine, drill mode (including honest count scenarios), gamification (7 skills, XP, ranks, 17
badges), profiles with export/import, and an optional Claude-powered AI coach (live + on-demand).
198 unit tests plus several Playwright suites, all green.

The project directory was renamed `blackjack-trainer` → `blackjack-coach` this session; in-app
branding, `package.json`, and `index.html` were renamed to match. README written with screenshots
in `docs/`.

## Blockers
None. Note: port 5173 is occupied by an unrelated app on this machine — always run
`npm run dev -- --port 5199 --strictPort` and point tests at :5199.

## Next step
Publishing steps, in order: **add a LICENSE** (without one the repo is legally all-rights-reserved,
which defeats publishing — MIT is the conventional pick), then create the GitHub repo as
`blackjack-coach`, set the description and topics recorded in CHECKLIST.md, and push.

## Open questions
- Which license? MIT assumed but not chosen.
- Alternative counting systems (KO, Hi-Opt I) would need their own verified indices, or deviation
  grading disabled while selected — worth it, or keep the app Hi-Lo only?
- Cloud-synced profiles need a backend, which the client-side-only constraint currently rules out.
