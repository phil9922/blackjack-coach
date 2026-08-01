# Checklist

## P0 — Required to work
- [ ] [10m] Add a LICENSE file (MIT unless the owner prefers otherwise) — without one a public repo is all-rights-reserved and nobody can legally use or fork it
- [x] [1h] Mobile layout QA sweep at 375–430px widths (table, rail, modals, Skills/Progress tables) and fix overflow issues found — milestone's definition of done
- [x] [45m] Verify Illustrious 18 / Fab 4 indices in `src/strategy/deviations.ts` against an H17-specific reference (e.g. current BJA/Schlesinger H17 tables); adjust thresholds + boundary tests to match — chart correctness is a must-never-break invariant and training targets real casino play

## P1 — Good ideas
- [ ] [20m] Create the GitHub repo as `blackjack-coach` and push. Description: "Blackjack basic strategy and card counting trainer — grades every decision, explains why, drills the hands you keep getting wrong, and finds patterns in your play with AI coaching." Topics: `blackjack`, `blackjack-strategy`, `basic-strategy`, `card-counting`, `hi-lo`, `blackjack-trainer`, `ai`, `ai-coach`, `llm`, `claude-api`, `react`, `typescript`
- [ ] [30m] Verify the AI coach's real output quality once a live API key is available — every path is tested with mocked/invalid keys, but no genuine generation has been seen. Tune the prompts in `src/coach-ai/{client,live}.ts` if the reads are vague or the running list churns between updates
- [x] [1.5h] Drill mode for deviations: construct high/low-true-count drill scenarios in counting mode so index plays get practiced, not just encountered
- [x] [45m] Profile export/import (JSON download/upload) so a profile can move between browsers
- [x] [45m] Hole-card flip animation and win/loss chip payout animation (respecting prefers-reduced-motion)

## P2 — Extras
- [x] [30m] Offer "even money" wording when the player has blackjack vs a dealer ace (currently shows the generic insurance prompt)
- [ ] [2h] Additional counting systems (KO, Hi-Opt I) selectable in settings, with matching true-count handling — NOTE: deviation indices are Hi-Lo-specific, so a second system must either ship its own verified indices or disable deviation grading while selected
- [x] [1.5h] Count speed-drill mini-game: flash a stream of cards, answer the running count at the end
- [x] [1h] Sound effects for deal/verdict/level-up with a mute toggle
- [ ] [4h] Cloud sync for profiles (needs a backend — out of scope for localStorage-only design)
