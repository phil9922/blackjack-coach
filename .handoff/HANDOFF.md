# Handoff

## Current focus
Published and feature-complete. The repo is live at
[`phil9922/blackjack-coach`](https://github.com/phil9922/blackjack-coach) — **private**, MIT
licensed, description and 12 topics set, `main` pushed. React + Vite + TS; grades every decision
against a verified H17/6D/DAS chart with explanations, hint button, bet advisor, AI table-mates,
counting mode (Hi-Lo / KO / Hi-Opt I, 20 verified Hi-Lo indices, quizzes, speed drill), stats with
outcome-vs-expectation trends, an 11-rule coaching engine, drill mode (including honest count
scenarios), gamification (7 skills, XP, ranks, 17 badges), profiles with export/import, and an
optional Claude-powered AI coach (live + on-demand). 237 unit tests plus Playwright suites, green.

Since publication the table itself got the attention: cards now size to a share of the felt divided
by the seat count, the felt is screen-printed with the dealer's arc and rule legends generated from
the live `TableRules`. Play gained **rewind** — take back a decision, the whole table unwinds with it, and the
grade you earned stands. Split hands are now individually boxed, numbered and dimmed so it is never
ambiguous which one you are acting on. The dock is `position: sticky` and verified across 11
viewports × ~27 game states never to leave the viewport.

Every checklist item is now done except two that need something this machine doesn't have: a real
Claude API key, and a backend.

## Blockers
None. The dev server is pinned to **5175** in `vite.config.ts` (`strictPort: true`) — run plain
`npm run dev` and point browser tests at :5175. The old "use `--port 5199`" instruction is obsolete;
the port is now part of the config precisely because saved progress is per-origin.

## Next step
Nothing is outstanding. **Further work should come from actually using the app at a table** rather
than from this checklist — the remaining P2s are a verification chore and two things that need a
backend or a transcription session, not features the app is missing.

`.env` in the project root holds the Claude API key (gitignored, and confirmed absent from the
production bundle). `npm test` stays offline and free; `npm run test:coach` is the paid live check.

**Nothing is deployed and no hosting is configured** — no workflow, no `vercel.json`/`netlify.toml`,
no `base` set in `vite.config.ts`. `npm run build` then `npm run preview` serves the production
bundle at <http://localhost:4173/>, local-only. A subpath host like GitHub Pages would additionally
need `base: '/blackjack-coach/'`; Vercel and Netlify would not.

## Open questions
- The AI coach's output was verified good over four live runs and needed no prompt changes. Two
  cosmetic drifts if they ever start to grate: the on-demand read runs ~340-365 words against a
  200-350 word instruction, and live details run 40-70 words against "one or two sentences".
- The KO key count and pivot in `src/counting/systems.ts` come from the standard published KO
  tables and are locked by tests, but unlike the strategy chart they have **not** been
  double-transcribed against an independent second source. They only steer bet size, never a play
  decision. Worth giving them fixture coverage like `src/strategy/__fixtures__`?
- Ship verified KO / Hi-Opt I index sets so deviation grading works there too? That is the only
  thing currently missing from those systems, and it is a transcription-and-verification job, not a
  coding one.
- Cloud-synced profiles need a backend, which the client-side-only constraint rules out.
- Repo is private — flip it public later, or keep it personal? Hosting was declined this session in
  favour of a local build; if that changes, the target choice is Vercel/Netlify (no config change)
  vs GitHub Pages (needs a `base`, and Pages on a private repo needs a paid plan).
- `img/header-banner.png` is committed but unreferenced — the README uses the SVG. It is kept as a
  raster for a GitHub social preview card, which requires PNG and wants exactly the 2:1 it now is.
