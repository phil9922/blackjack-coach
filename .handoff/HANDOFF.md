# Handoff

## Current focus
Feature-complete and committed on `main`; **the repo is public** at
`github.com/phil9922/blackjack-coach` as of 2026-08-12. React + Vite + TS. Grades
every decision against a verified H17/6D/DAS chart with explanations, hint button, bet advisor, AI
table-mates, counting mode (Hi-Lo / KO / Hi-Opt I), stats, an 11-rule coaching engine, drill mode,
gamification, profiles with export/import, and an optional Claude coach. 275 unit tests, green.

This session was verification, not features. KO's betting numbers — tags, IRC, key counts, pivot —
are now double-transcribed and locked by `src/counting/__fixtures__/ko-reference.ts` the way the
strategy chart is, which caught one real gap (the published four-deck key count was missing, so
`koKeyCount(4)` silently returned the six-deck value). The KO / Hi-Opt I **deviation index** sets
were researched and deliberately not shipped: no open-web source clears the two-source bar. That
decision and every source checked are in `docs/index-set-sourcing.md`.

## Blockers
None in the code. Two things are waiting on something other than work:
- **Deviation index sets for KO and Hi-Opt I need printed tables.** Not a coding gap — the
  `supportsDeviations` flag is already the switch. It needs Humble & Cooper ch. 8 + p. 263
  (Hi-Opt I) and the KO Preferred matrix from *Knock-Out Blackjack* (KO), as text or a legible
  photo. Don't re-research this from the web; `docs/index-set-sourcing.md` records what was already
  checked and why each source fails. KO additionally needs a running-count grading path.
- **Screenshots from a real profile.** `docs/coach.png` and `docs/skills.png` still show an older
  profile. Capturing from the owner's own requires them to press **Settings → Player profiles →
  Export**; their data is in a running Chrome's `localStorage` and is not on disk, and a driven
  browser gets an empty profile. The import-and-capture script is written and tested — it needs only
  the `.bjt-profile.json`.

The dev server is pinned to **5175** (`vite.config.ts`, `strictPort`). Run plain `npm run dev`; the
old `--port 5199` instruction is obsolete.

## Next step
Nothing is outstanding in the code, and the repo is out. Let further work come from **actually
using the app at a table** — what remains on the checklist is blocked on a book, needs a backend,
or is small polish, not features the app is missing.

Now that the repo is public, two things change in kind: issues and PRs can arrive from strangers
(the README's contributing rule is that anything touching the chart, the indices or a system's
numbers must bring its source and pass the fixtures), and `.handoff/.state.json` is no longer
tracked — it held local scratchpad paths and a shell-command log. Its *old* versions are still in
history; nothing secret, just local paths, so it was left rather than rewriting history.

`.env` holds the Claude API key (gitignored, confirmed absent from the bundle). `npm test` is
offline and free; `npm run test:coach` is the paid live check. Nothing is deployed.

## Open questions
- **Live coaching bills a call every ~8 hands to usually say nothing.** Its prompt tells the model
  "most updates should return an empty string", so silence is by design — but each silent check is
  paid. Now that the rail has an on-demand ask, is `liveCoach: 'off'` the better default?
- Worth building an exact combinatorial EV engine to *derive* index sets instead of transcribing
  them? It would be self-verifying — prove it by reproducing the already-locked Hi-Lo Illustrious 18
  and Fab 4 cell for cell, then trust its Hi-Opt I and KO output — and it would let the app grade
  any counting system. Days of work, not hours, and it is the only route that doesn't need a book.
- Every published KO table descends from one source (Fuchs & Vancura), so the new fixture verifies
  the transcription, not the underlying numbers. Same bargain the chart fixture makes. Fine?
- Cloud-synced profiles need a backend, which the client-side-only constraint rules out.
- The sticky dock can occlude the bottom of the felt when content overflows a short window. Content
  is still reachable by scrolling. Worth adding bottom padding so seats always clear it?
- `img/header-banner.png` is committed but unreferenced — kept as a raster for a GitHub social
  preview card, which requires PNG at 2:1.
