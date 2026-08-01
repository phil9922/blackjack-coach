# Checklist

## P0 — Required to work
- [x] [1h] Mobile layout QA sweep at 375–430px widths (table, rail, modals, Skills/Progress tables) and fix overflow issues found — milestone's definition of done
- [x] [45m] Verify Illustrious 18 / Fab 4 indices in `src/strategy/deviations.ts` against an H17-specific reference (e.g. current BJA/Schlesinger H17 tables); adjust thresholds + boundary tests to match — chart correctness is a must-never-break invariant and training targets real casino play

## P1 — Good ideas
- [x] [1.5h] Drill mode for deviations: construct high/low-true-count drill scenarios in counting mode so index plays get practiced, not just encountered
- [x] [45m] Profile export/import (JSON download/upload) so a profile can move between browsers
- [x] [45m] Hole-card flip animation and win/loss chip payout animation (respecting prefers-reduced-motion)

## P2 — Extras
- [ ] [30m] Offer "even money" wording when the player has blackjack vs a dealer ace (currently shows the generic insurance prompt)
- [ ] [2h] Additional counting systems (KO, Hi-Opt I) selectable in settings, with matching true-count handling
- [ ] [1.5h] Count speed-drill mini-game: flash a stream of cards, answer the running count at the end
- [ ] [1h] Sound effects for deal/verdict/level-up with a mute toggle
- [ ] [4h] Cloud sync for profiles (needs a backend — out of scope for localStorage-only design)
