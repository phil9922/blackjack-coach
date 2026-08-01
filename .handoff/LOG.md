# Log

## 2026-08-01
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
