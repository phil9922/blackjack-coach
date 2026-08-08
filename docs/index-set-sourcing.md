# Why KO and Hi-Opt I don't grade deviations

`src/counting/systems.ts` ships `supportsDeviations: false` for KO and Hi-Opt I, so while
either is selected the app grades plays as straight basic strategy. That is not an oversight
and it is not a coding gap — the switch is already there. It is a **sourcing** problem, and
this note records what was checked on 2026-08-08 so nobody researches it from zero again.

The bar: an index set is only shipped if it can be transcribed from a published source and
checked against a second, independent one, the way `src/strategy/__fixtures__` locks the
chart. Index numbers drive graded plays. A wrong one teaches a wrong play — the worst thing
this app can do.

## Hi-Opt I

The authoritative indices are Humble & Cooper, *The World's Greatest Blackjack Book*,
chapter 8, with the dealer-hits-soft-17 modifications on p. 263. Nothing on the open web
reproduces them in text.

- DeepNet Technologies publishes a [Hi-Opt I database
  guide](http://www.deepnettech.com/HiOptI.pdf) whose `Multi2` index set matches this app's
  rules exactly — 4+ decks, DAS, H17, double any two — and states it is built from ch. 8 plus
  the p. 263 H17 table. It documents the index sets and their simulated expectations. It
  prints **none of the index numbers**; those live in the paid Palm/Windows database.
- [QFIT's Hi-Opt I page](https://www.qfit.com/cardcounting/Hi-Opt-I/) gives the tags and the
  efficiency figures (BC .88, PE .61, IC .85) and explicitly carries no indices.
- The free discussions that do quote numbers contradict each other on the most famous cell
  in the set — 16 v 10 appears as **+2** in one cited file and **0** in another, per [this
  thread](https://wizardofvegas.com/forum/gambling/blackjack/21609-hi-lo-and-hi-opt-indices/),
  whose participants could not resolve it either. Note that 0 is simply the *Hi-Lo* index;
  several sources appear to be repeating the Hi-Lo Illustrious 18 under a Hi-Opt I heading,
  which is the exact failure mode this bar exists to catch.

## KO

Two problems, and the second one is structural.

1. **Sourcing.** The deviation set is the *KO Preferred* matrix from Fuchs & Vancura,
   *Knock-Out Blackjack*, and it is printed only there. Reproductions disagree: in [one
   thread](https://www.blackjackinfo.com/community/threads/ko-full-and-the-illustrious-18.2602/)
   10,10 v 5 is proposed as +10 and answered with a simulated +7, and there is disagreement
   over which plays belong in the six-deck set at all.
2. **Shape.** KO is unbalanced and has no true count. Its indices are **running counts, and
   they differ per deck count** — a KO index is meaningless without the shoe size attached.
   `findDeviation(key, up, trueCount, surrenderAvailable)` takes a true count, and
   `currentTrueCount` deliberately returns 0 for unbalanced systems. Supporting KO means
   changing the grading path, not just adding a data table.

The KO *betting* numbers — tags, IRC, key count, pivot — are a different matter and **are**
verified: see `src/counting/__fixtures__/ko-reference.ts`. They steer bet size only.

## What would unblock this

The printed tables, as text or a legible photo:

- Hi-Opt I — Humble & Cooper ch. 8, plus the H17 modifications on p. 263.
- KO — the KO Preferred matrix from *Knock-Out Blackjack*, six-deck column.

With either in hand the work is a fixture, a test and flipping one flag — a few hours. KO
additionally needs the running-count grading path above.

The other route is deriving the indices in-repo: an exact combinatorial EV engine, validated
by reproducing the already-verified Hi-Lo Illustrious 18 and Fab 4 cell for cell before its
Hi-Opt I output is trusted. That is a genuinely self-verifying answer and it would let the
app grade any system, but it is days of work, not hours.
