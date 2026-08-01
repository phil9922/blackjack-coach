# Handoff

## Current focus
Published and feature-complete. The repo is live at
[`phil9922/blackjack-coach`](https://github.com/phil9922/blackjack-coach) — **private**, MIT
licensed, description and 12 topics set, `main` pushed. React + Vite + TS; grades every decision
against a verified H17/6D/DAS chart with explanations, hint button, bet advisor, AI table-mates,
counting mode (Hi-Lo / KO / Hi-Opt I, 20 verified Hi-Lo indices, quizzes, speed drill), stats with
outcome-vs-expectation trends, an 11-rule coaching engine, drill mode (including honest count
scenarios), gamification (7 skills, XP, ranks, 17 badges), profiles with export/import, and an
optional Claude-powered AI coach (live + on-demand). 224 unit tests plus Playwright suites, green.

Every checklist item is now done except two that need something this machine doesn't have: a real
Claude API key, and a backend.

## Blockers
- **AI coach output quality is still unverified.** Every code path is tested with mocked and
  invalid keys, but no genuine generation has ever been seen. The harness is written and waiting —
  `ANTHROPIC_API_KEY=sk-ant-... npx vitest run src/coach-ai/real-api.test.ts` — it just needs a key.
  No `ANTHROPIC_API_KEY` and no `ant` CLI profile exist here, and the app's client sends the key as
  `x-api-key`, so an OAuth token would not work in its place.
- Port 5173 is occupied by an unrelated app on this machine — always run
  `npm run dev -- --port 5199 --strictPort` and point browser tests at :5199.

## Next step
Run the AI coach harness with a real key and read the three printed outputs. It asserts format and
substance but the useful signal is the prose itself: does the on-demand read name the *instinct*
behind the soft-double leak rather than listing cells, and does the live list carry items forward
between updates instead of rewriting itself? Tune `src/coach-ai/{client,live}.ts` if not.

After that, the honest answer is that further work should come from actually using the app at a
table rather than from this checklist.

## Open questions
- The KO key count and pivot in `src/counting/systems.ts` come from the standard published KO
  tables and are locked by tests, but unlike the strategy chart they have **not** been
  double-transcribed against an independent second source. They only steer bet size, never a play
  decision. Worth giving them fixture coverage like `src/strategy/__fixtures__`?
- Ship verified KO / Hi-Opt I index sets so deviation grading works there too? That is the only
  thing currently missing from those systems, and it is a transcription-and-verification job, not a
  coding one.
- Cloud-synced profiles need a backend, which the client-side-only constraint rules out.
- Repo is private — flip it public later, or keep it personal?
