# Checklist

## P0 — Required to work
- [x] [10m] Add a LICENSE file (MIT unless the owner prefers otherwise) — without one a public repo is all-rights-reserved and nobody can legally use or fork it
- [x] [1h] Mobile layout QA sweep at 375–430px widths (table, rail, modals, Skills/Progress tables) and fix overflow issues found — milestone's definition of done
- [x] [45m] Verify Illustrious 18 / Fab 4 indices in `src/strategy/deviations.ts` against an H17-specific reference (e.g. current BJA/Schlesinger H17 tables); adjust thresholds + boundary tests to match — chart correctness is a must-never-break invariant and training targets real casino play

## P1 — Good ideas
- [x] [20m] Create the GitHub repo as `blackjack-coach` and push (created **private** at the owner's request). Description: "Blackjack basic strategy and card counting trainer — grades every decision, explains why, drills the hands you keep getting wrong, and finds patterns in your play with AI coaching." Topics: `blackjack`, `blackjack-strategy`, `basic-strategy`, `card-counting`, `hi-lo`, `blackjack-trainer`, `ai`, `ai-coach`, `llm`, `claude-api`, `react`, `typescript`
- [ ] [15m] Verify the AI coach's real output quality — harness is written and gated on a key: `ANTHROPIC_API_KEY=sk-ant-... npx vitest run src/coach-ai/real-api.test.ts`. Read the three printed outputs and tune `src/coach-ai/{client,live}.ts` if the reads are vague or the running list churns between updates
- [x] [1.5h] Drill mode for deviations: construct high/low-true-count drill scenarios in counting mode so index plays get practiced, not just encountered
- [x] [45m] Profile export/import (JSON download/upload) so a profile can move between browsers
- [x] [45m] Hole-card flip animation and win/loss chip payout animation (respecting prefers-reduced-motion)

## P2 — Extras
- [ ] [2h] Double-transcribe the KO key count / pivot in `src/counting/systems.ts` against an independent second source and add fixture coverage, the way `src/strategy/__fixtures__` locks the chart — they only steer bet size, never a play, so this is lower stakes than the chart but currently the one unverified number in the app
- [ ] [4h] Ship verified KO / Hi-Opt I deviation index sets so index plays grade in those systems too (transcription + verification work, not coding — the `supportsDeviations` flag is already the switch)
- [x] [30m] Offer "even money" wording when the player has blackjack vs a dealer ace (currently shows the generic insurance prompt)
- [x] [2h] Additional counting systems (KO, Hi-Opt I) selectable in settings, with matching true-count handling — shipped with deviation grading disabled for the non-Hi-Lo systems, per the constraint
- [x] [1.5h] Count speed-drill mini-game: flash a stream of cards, answer the running count at the end
- [x] [1h] Sound effects for deal/verdict/level-up with a mute toggle
- [ ] [4h] Cloud sync for profiles (needs a backend — out of scope for localStorage-only design)
