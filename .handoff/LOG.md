# Log

## 2026-08-12
- **The repo is public** — `github.com/phil9922/blackjack-coach`, verified with an unauthenticated
  API fetch rather than trusting the flag (`gh repo edit --visibility public`; this `gh` build has
  no `--accept-visibility-change-consequences` flag, so the plain form is correct). Re-verified
  before flipping instead of relying on the earlier check: 275 tests green, `npm run build` clean,
  and no key-shaped string (`sk-ant-[A-Za-z0-9_-]{20,}`) anywhere in full history or in `dist/`.
  The `sk-ant-` hits that do exist are the Settings input placeholder and a rejected-key error
  message — source, not secrets.
- **Untracked `.handoff/.state.json`** (`59ec206`) — 29KB of tooling exhaust carrying ~40
  `/tmp/claude-1000/…` scratchpad paths, 18 `/home/pk` paths and a log of shell commands. Now
  gitignored in `.gitignore` rather than only `.git/info/exclude`, which isn't shared. The four
  `.handoff/*.md` files stay tracked deliberately — they read as an engineering log. Old versions
  of `.state.json` remain in history; nothing secret in them, so history was left unrewritten
  rather than force-pushing over a published repo.
- **Docs readied for strangers** (`59ec206`) — README now links `docs/index-set-sourcing.md` from
  the counting-systems paragraph so "only Hi-Lo grades deviations" carries its receipts, names the
  stack and the Node floor, corrects 247 → 275 tests, and adds a Status and contributing section
  whose one hard rule is that any change to the chart, the indices or a system's numbers arrives
  with a source and passes the fixtures. Every numeric claim in the README was re-checked against
  the source first — 20 deviations, 7 skills, 17 achievements, 11 coach rules, 36 hand-written
  explanations, 4 AI personas, max 4 seats — and all of them held.
- **Revisited the no-hosting decision** (`59ec206`) — it was explicitly conditioned on "revisit if
  the repo goes public", and that trigger just fired. Still no hosting, now recorded as a live
  choice rather than a consequence of privacy: `npm run build` emits a static `dist/`, so it is a
  five-minute reversal whenever a demo is actually wanted.

## 2026-08-08
- **Double-transcribed KO's betting numbers and locked them** (`b65ef4d`) — new
  `src/counting/__fixtures__/ko-reference.ts` carries the tags, per-deck IRC, key counts and pivot
  re-transcribed from published sources without reading `systems.ts`, and
  `src/counting/ko-reference.test.ts` asserts the two agree (28 tests, suite 247 → 275). The
  fixture header states that all published KO tables descend from one book (Fuchs & Vancura), so
  what is independent is the transcription path, not the derivation.
- **Found and fixed a real gap while doing it** (`b65ef4d`) — the published four-deck key count
  (-1) was missing from `KO_KEY_COUNTS`, so `koKeyCount(4)` fell through the nearest-listed rule
  and resolved to the six-deck -4. The app deals six decks so nothing shipped wrong, but the
  function is exported and would have been wrong the moment deck count became configurable.
  Regression test pins it. Tags, IRC, the other key counts and the +4 pivot all checked out.
- **Researched the KO / Hi-Opt I deviation index sets and stopped rather than guess** (`b65ef4d`) —
  no open-web source clears the project's two-source bar. Hi-Opt I's indices live in Humble &
  Cooper ch. 8 plus the H17 modifications on p. 263 and in DeepNet's paid database, whose public
  PDF documents an index set matching our exact rules but prints none of its numbers; the free
  reproductions contradict each other on 16 v 10 (+2 vs 0, and 0 is simply the Hi-Lo index repeated
  under a Hi-Opt I heading). KO's set is the KO Preferred matrix, book-only, with reproductions
  disagreeing on 10,10 v 5 (+10 vs a simulated +7). Findings written to
  `docs/index-set-sourcing.md`, pointed at from the `supportsDeviations` comment in `systems.ts`.
- **Noted that KO would need more than data** — its indices are running counts that vary by shoe
  size, while `findDeviation` takes a true count and `currentTrueCount` deliberately returns 0 for
  unbalanced systems. Supporting KO means changing the grading path, not adding a table.

## 2026-08-02
- **Rewind** (`e2c3e66`) — `Z` or a button in the dock and rail takes back a decision and unwinds
  the whole table: shoe position, running count, hole card, bets, splits. New `REWIND` action and
  `rewind`/`replayCredits` in `GameState` (`src/engine/game.ts`), `RewindButton.tsx`. The grade
  already earned stands: the replay is marked `replayed` (`src/strategy/types.ts`) and skipped by
  `recordDecision` (`useGame.ts`), so taking a move back can never buy back accuracy. 9 tests.
- **Printed felt** (`e2c3e66`) — `TableLayout.tsx` draws the dealer's arc, insurance line, payout
  legend and soft-17 rule in its own band between dealer and players. Legends are generated from
  the live `TableRules`, so the felt can never advertise a game the dealer isn't dealing; 4 tests
  pin that.
- **Card sizing** (`e2c3e66`) — `--card-w` is now a share of the felt divided by `--seats`, so a
  heads-up table deals 140px cards and a full table shrinks rather than wrapping. Everything inside
  a card derives from it.
- **Pinned the dev server to 5175** with `strictPort` (`vite.config.ts`). `localStorage` is
  partitioned by origin *including the port*, so a wandering dev server was silently stranding
  saved profiles behind an address with no reason to revisit. Diagnosed after the port had already
  drifted 5173 → 5175 this session.
- **Layout fixes** (`e2c3e66`) — the dock is `position: sticky` and no longer relies on
  `calc(100vh - 60px)`, which assumed a 60px header and was wrong by up to 110px once it wrapped;
  verified across 11 viewports × ~27 game states. Split hands are individually boxed, numbered and
  dimmed. "Got it — continue" added to the dock. Suggested-bet reasoning moved from a slab between
  the cards and the chips to the verdict rail (dock 239px → 130px); Apply settings is a sticky bar.
- **Bounded the table view to the viewport** (`e2c3e66`) — a long verdict rail was sizing the grid
  row and stretching the felt with it (2638px felt, 1796px of page scroll with 10 cards). Root
  cause was that an `fr` row needs a *definite* height and `min-height: 100vh` is not one, so `1fr`
  degraded to max-content. `.app--table { height: 100vh }` fixed it; rail now scrolls itself.
- **Dropped the casino table themes** (`2fcc660`) — seven room palettes shipped in `e2c3e66`, then
  came out before going public: the palettes were original but the names were other companies'
  trademarks, visible in Settings and the README. Removed the whole system (`src/table/`, the
  `tableTheme` setting, the picker) rather than renaming, since a one-option picker is dead UI. The
  printed felt stays.
- **Ask the AI coach a question** (`d9b27fe`) — the rail button now opens a modal prefilled with
  "Review my recent play…", selected so typing replaces it, plus five presets. New
  `askCoachQuestion` in `coach-ai/client.ts` with a prompt pinned to the question; both prose calls
  now share one request path so the browser flag, fallback beta and error mapping can't drift.
  Nothing fires until Ask is pressed. Also found that live coaching was billing a call every ~8
  hands to usually say nothing — its prompt tells it "most updates should return an empty string".
- **Hand log export** (`845a142`) — Settings → Hand log writes CSV or JSON: one row per settled
  hand with dealer upcard, starting hand, bet, result, net and the round's decisions vs the book.
  New `src/stats/handLog.ts`, 10 tests. Reassembles rounds from timestamps since nothing carries a
  round id. Surfaced two limits in the UI rather than hiding them: splits share their round's
  decisions, and history is capped at 1000 decisions / 2000 hands so old rounds are already gone.
- **Docs** — README updated for the printed felt, card sizing, rewind, hand log, the pinned port
  and the test count (224 → 247). `docs/table.png` regenerated; `coach.png`/`skills.png`
  deliberately left alone after checking `git diff` showed zero changes to those screens.
- **Not done: the repo is still private.** Asked to publish, I paused on the trademark names; the
  owner chose to delete the themes instead. Visibility has not been changed.
- **Not done: screenshots from the owner's own session.** Their profile lives in a running Chrome's
  `localStorage`, unflushed to disk; a driven browser gets an empty one. A LevelDB read was blocked
  by the permission classifier and a 30-minute watcher for a `Settings → Export` file timed out.
  The import-and-capture pipeline is written and tested (`from_export.py`) and needs only the file.


## 2026-08-01
- **Published the repo** as `phil9922/blackjack-coach` — **private**, at the owner's request
  (`18f2ce3`, pushed). Added MIT `LICENSE`, a `license` field in `package.json`, and a README
  license section; GitHub detects MIT and all 12 topics from CHECKLIST.md are set. Also untracked
  `tsconfig.tsbuildinfo` and `.claude-swarm-feed.log` (local build/tooling output) and ignored them.
- **Added KO and Hi-Opt I counting systems** (`dbc035d`), the last open P2 of any size. New
  `src/counting/systems.ts` holds tag values, balance, IRC and a `supportsDeviations` flag;
  `Settings.countSystem` threads through `game.ts` (draw, reveal, reshuffle, drill burns), the
  quiz, speed drill, bet advisor and drill planner. Only Hi-Lo keeps deviation grading — the other
  two grade as basic strategy with an in-app note saying why, which is the option PROJECT.md
  sanctioned. KO needed more than new tags: negative IRC of 4(1-decks), no true count to show or
  quiz on, and a bet ramp anchored to its published key count and pivot rather than converted to a
  Hi-Lo true count (that conversion would have maxed the bet out several running-count points too
  early). 26 new tests; suite is 224 passing.
- **Found and fixed a real count bug by driving the running app**, not by testing: switching
  systems mid-shoe kept the old running count and carried on adding the new system's tags,
  producing a meaningless number. `applySettings` now takes a fresh shoe on a system change.
  Verified with 13 Playwright checks against :5199 (chip text, IRC, no TC for KO, bet-advice
  wording, warning copy) — all green — plus a regression test and an engine-level invariant that
  the running count always equals the IRC plus exactly the face-up cards, for all three systems.
  Both new test groups were mutation-checked (broke a tag value, then the hole-card rule) to
  confirm they actually bite.
- Added the header banner to the README and cropped it (`d570097`, `4d7ef22`, `e6e1153`). Used
  `img/header-banner.svg` over the 766K PNG — verified it renders identically by rasterizing it the
  way GitHub does (as an `<img>`, not inlined) — then cropped its viewBox from 1310x760 to the
  1280x640 green panel, which removed the white margin and clipped the two decorative circles that
  were reading as sage-grey where they spilled onto white. One attribute changed; no shapes touched.
  Re-exported `header-banner.png` from the cropped source at the same 4x scale: 5120x2560, exactly
  2:1 (GitHub's social-preview ratio), and 380K instead of 766K now the white canvas is gone. Edges
  verified against a magenta backdrop and by pixel-checking all four corners plus both edge
  midpoints.
- Built and smoke-tested the production bundle: served `dist/` and drove it in a browser (counting
  mode, a dealt hand, action buttons, zero console errors), and confirmed the real key from `.env`
  is absent from the build. No hosting was set up — see the decision in PROJECT.md.
- Documented the paid-test setup in the README: corrected the stale `npm test  # 198 tests` line to
  224, added `npm run test:coach`, and wrote down the `.env` / `ANTHROPIC_API_KEY` contract
  including why an API key must never carry a `VITE_` prefix (Vite inlines those into `dist/`).
- **Verified the AI coach against the live API** — the last open item. Quality is strong and the
  prompts needed no changes: the on-demand read headed a section *"The soft hands are one leak, not
  eight"*, named the instinct (*"treating the ace as insurance instead of leverage"*), caught the
  over-doubling as a half-learned rule, and declined the variance bait on 16 vs 10 (*"You're playing
  that fine. The -70 bankroll is variance, not diagnosis"*). The live list carried 7-9 of 10 titles
  across an update and correctly promoted the fixed leak to doingWell while keeping the still-broken
  soft-18 item. All three initial failures were miscalibrated assertions, not coach output — see the
  commit for what each got wrong. Two follow-on fixes: wiring `.env` into `test.env` had silently
  made `npm test` hit the paid API on every run (108s, four billed calls), so the live suite now
  needs `COACH_LIVE=1` via `npm run test:coach`; and the "did the fixed leak leave needsWork" check
  was removed as untestable by regex, since an over-doubling item that contrasts itself with the
  now-fixed soft doubles matches any /soft/+/doubl/ pattern.
- **Built a live-API quality harness for the AI coach** (`7052acc`): `src/coach-ai/real-api.test.ts`,
  skipped unless `ANTHROPIC_API_KEY` is set so `npm test` stays offline. The fixture is shaped so a
  coach following the prompt has to notice three things — a soft-double leak spread one miss each
  across eight cells, over-doubling on hard hands, and a 16 vs 10 losing exactly what perfect play
  expects — and the third test runs the live coach twice with the leak fixed to assert the running
  list carries forward instead of churning. **Not yet run against a real key** (none available on
  this machine; the app takes the user's own key), so coach output quality remains unverified.

### Earlier today
- Renamed the project to **Blackjack Coach** and wrote the README (`d0fec7b`). Directory
  `blackjack-trainer` → `blackjack-coach`; `package.json`, `index.html`, the in-app header, and a
  profile-import error string all renamed to match (the stale in-app name was caught by taking
  README screenshots, not by grep). README leads with the verified-chart differentiator and the
  four H17 cells commonly-circulated summaries get wrong; screenshots regenerated post-rebrand into
  `docs/`. All figures in it were counted from source rather than estimated (17 badges, 7 skills,
  20 deviation indices, 11 coach rules, 36 curated explanations, 198 tests).
- Chose the repo name after checking GitHub: `blackjack-trainer`, `blackjack-strategy`, and
  `blackjack` are all taken by active repos with similar scope, so an exact-match name would rank
  below them. Settled on `blackjack-coach`, with AI kept out of the name (see PROJECT.md).
- Deepened pattern detection (`f1caace`) after comparing the engine against an external
  114-hand analysis of the user's play. Two structural gaps found: no rule existed for
  *choosing* double wrongly (the "weak dealer means double" overcorrection was invisible), and
  missed-doubles lumped soft and hard together, hiding the common profile of reliable hard
  doubles + weak soft doubles. Added `over-doubling`, split into `missed-soft-doubles` /
  `missed-hard-doubles`, added `actionBreakdown` (kind of error vs which cell), and the AI digest
  now carries every missed cell (minSeen 1) so a pattern spread thin across many cells stays
  visible. Both prompts teach how to read it rather than what to find.
- Also verified that external analysis against this app's chart: 4 of its cells were S17 answers,
  wrong for H17 (11 vs A, A,7 vs 2, A,8 vs 6, and A,4/A,5 vs 4). Flagged to the user.
- Live AI coach (`4cb4db3`): reviews the record between hands on a configurable cadence and keeps
  a running doing-well / costing-you / try-this list, using structured outputs (json_schema) so the
  list is data. Each run receives its own previous assessment and returns an updated one, so items
  resolve instead of accumulating. In-game alerts are gated by a deliberately high bar in the
  prompt. `shouldRunLive` requires both new hands and new graded decisions so idle rounds can't
  spend a paid call. Verified end-to-end with a mocked API response (16 checks) — request shape,
  alert, list rendering, persistence, and no duplicate call on reload.
- Optional AI coach (`5853b6c`): Progress-tab panel sends a compact derived-stats digest to
  `claude-opus-5` via the official SDK (browser-direct, user's own key) and renders a narrative
  read. Refusal fallbacks enabled; typed SDK errors mapped to plain-language messages. API key
  stored under its own global localStorage key so profile exports can never carry it — asserted by
  test. Gated at 20 graded decisions. Browser test confirmed CORS works (a bad key returns a clean
  401 surfaced as a friendly error); the success path needs a real key, so it is user-verified.
- Table sounds (`c1a939b`): Web Audio oscillator voices (card, chip, correct, miss, level-up), no
  asset files, off by default, toggle in Settings. Verified by spying on createOscillator — silent
  by default, audible once enabled. Full E2E regression re-run: 32 checks green.
- Even money + count speed drill (`e878c1f`): naturals vs a dealer ace now get the real even-money
  offer and its own explanation (payout math was already equivalent to insurance, so this was
  wording + grading only). Speed drill launches from the Keeping the Count skill card — real
  shuffled deck, four tempos, XP scaled by tempo/length, tracks best pace, new Speed Counter badge.
- Table animations (`30fbb4a`): hole-card 3D flip on reveal (card remounts on reveal so it
  re-fires), result-badge and net-payout pops, all off under prefers-reduced-motion. Verified by
  recording `animationstart` events rather than sampling, since the flip is shorter than a tick.
- Deviation drills (`c6c2093`): counting-mode drill scenarios that reach a target true count by
  discarding real cards to the tray (shown face-up, countable) instead of faking the count; burns
  aim at the count as it will read at decision time. Each index gets both a live and a just-short
  variant so the drill trains judgment. All P1s now done too.
- Verified H17 deviation indices against BJA's H17 chart + Wong's Professional Blackjack
  (`d0bb374`): corrected 12v6 (-4, was -1), 13v3 (-3), 12v4 (-1), 16v9 (+4); added
  surrender-aware deviation semantics (stand deviations skipped when surrender available;
  reverse Fab 4 indices for 15v10/15vA in negative shoes); 11vA confirmed basic. All values
  locked by dedicated index tests. Both P0s now done — milestone complete.
- Profile export/import as JSON (`8136e0b`): per-profile Export download, Import with
  validation, round-trip tested.
- Mobile QA sweep done (`022268a`): compact header at <=700px, 46px cards, removed the desktop
  min-height dead gap, settings-row wrapping + the `fieldset` min-content overflow fix, and
  auto-scroll of the verdict rail into view on stacked layouts (back to controls after ack).
  Zero horizontal overflow on all six screens at 390px; 144 unit tests + desktop E2E still green.
- Set up handoff tracking.
- Built the entire app from an empty directory in one session, 4 commits:
  - `5ca9f44` core trainer: pure engine (shoe/hands/H17 dealer/payouts), multi-seat game reducer,
    H17/6D/DAS strategy chart (cross-validated cell-by-cell against an independent transcription of
    the published Wizard of Odds chart — 360/360 match), curated+template explanations, grading
    pipeline, hint button, bet advisor, AI table-mates with imperfect play profiles, Hi-Lo counting
    mode with Illustrious 18/Fab 4 deviations and count quizzes, stats + outcome matrix vs
    expectation baselines, coaching engine, felt-table UI with verdict rail.
  - `eef6c10` drill mode (weighted trouble-spot dealing via rigged shuffle, honest shoe), Progress
    tab with strengths/needs-work overview + session log derived from timestamped history.
  - `78a2b15` gamification: 7 skill tracks with XP/levels, player rank, 16 achievements, in-game
    XP/level-up/badge notices, Skills tab.
  - `b5402a9` multiple user profiles: namespaced localStorage with legacy migration, header
    switcher + Settings management, per-profile persistent bankroll.
- Verified throughout with 144 Vitest tests and three Playwright E2E suites (all passing).
