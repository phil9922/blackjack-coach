# Log

## 2026-08-01
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
