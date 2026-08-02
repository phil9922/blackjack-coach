# Handoff

## Current focus
Feature-complete and committed on `main`; **the repo is still private**. React + Vite + TS. Grades
every decision against a verified H17/6D/DAS chart with explanations, hint button, bet advisor, AI
table-mates, counting mode (Hi-Lo / KO / Hi-Opt I), stats, an 11-rule coaching engine, drill mode,
gamification, profiles with export/import, and an optional Claude coach. 247 unit tests, green.

This session was all table and presentation: **rewind** (take a decision back, the shoe and count
unwind with it, the grade stands), a **printed felt** whose legends are generated from the live
rules, **seat-aware card sizing**, a **sticky dock** verified never to leave the viewport, the
**table view bounded to the viewport** so a long rail scrolls itself instead of stretching the felt,
an **ask-the-coach modal**, and a **hand log export** (CSV/JSON). Seven casino table themes shipped
and were then deliberately removed before publishing — see Decisions.

## Blockers
None in the code. Two things are waiting on the owner, not on work:
- **Publishing.** `gh repo edit --visibility public` is the whole job. `.env` is untracked, ignored,
  and no `sk-ant-` string appears in any commit across the full history (checked).
- **Screenshots from a real profile.** `docs/coach.png` and `docs/skills.png` still show an older
  profile. Capturing from the owner's own requires them to press **Settings → Player profiles →
  Export**; their data is in a running Chrome's `localStorage` and is not on disk, and a driven
  browser gets an empty profile. The import-and-capture script is written and tested — it needs only
  the `.bjt-profile.json`.

The dev server is pinned to **5175** (`vite.config.ts`, `strictPort`). Run plain `npm run dev`; the
old `--port 5199` instruction is obsolete.

## Next step
Nothing is outstanding in the code. Publish when ready, then let further work come from **actually
using the app at a table** — the remaining checklist items are a transcription chore and things
needing a backend, not features the app is missing.

`.env` holds the Claude API key (gitignored, confirmed absent from the bundle). `npm test` is
offline and free; `npm run test:coach` is the paid live check. Nothing is deployed.

## Open questions
- **Live coaching bills a call every ~8 hands to usually say nothing.** Its prompt tells the model
  "most updates should return an empty string", so silence is by design — but each silent check is
  paid. Now that the rail has an on-demand ask, is `liveCoach: 'off'` the better default?
- The KO key count and pivot in `src/counting/systems.ts` are locked by tests but, unlike the
  strategy chart, have not been double-transcribed against an independent second source. They steer
  bet size only, never a play.
- Ship verified KO / Hi-Opt I index sets so deviation grading works there too? Transcription and
  verification work, not coding.
- Cloud-synced profiles need a backend, which the client-side-only constraint rules out.
- The sticky dock can occlude the bottom of the felt when content overflows a short window. Content
  is still reachable by scrolling. Worth adding bottom padding so seats always clear it?
- `img/header-banner.png` is committed but unreferenced — kept as a raster for a GitHub social
  preview card, which requires PNG at 2:1.
