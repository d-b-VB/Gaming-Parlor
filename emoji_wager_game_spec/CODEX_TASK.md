# Codex Implementation Task

Build the first playable prototype of the Emoji Wager Game from the ground up.

## Deliverable

A minimal but functional browser game with three sorting modes in the model:

1. **2-way sort**: playable immediately.
2. **3-way sort**: locked until purchased.
3. **4-way sort**: locked until purchased.

The first implementation should get something playable and testable before adding polish.

## Implementation order

1. Load and validate `data/items.json` and `data/category_selectors.json`.
2. Implement selector matching over tags, colors, kind, and exclusions.
3. Implement configurable sorting-mode definitions for 2-way, 3-way, and 4-way sort.
4. Generate valid sorting boards for each mode from the same catalog and selector system.
5. Render only the target glyphs for each visible group; do not require category text labels in the first playable UI.
6. Support keyboard and click/touch dispatch for the active mode's directions.
7. Animate correct and wrong dispatches, including streak-based animation acceleration.
8. Track completion time, mistakes, streak, and the percentile outcome of each run.
9. Estimate future beat targets from memory, such as times the player is roughly 50% or 10% likely to beat.
10. Implement pre-round Club betting: the player chooses a time-to-beat/odds offer and buys any number of Clubs they can afford.
11. Settle winning Club bets as Diamond payouts based on odds; losing Club bets pay nothing.
12. Implement Hearts, Diamonds, mode unlock purchases, Heart restoration, and Spade upgrade purchases.
13. Persist state to localStorage.
14. Add tests matching `docs/08_acceptance_tests.md`.

## Do not implement yet

- Real-money wagering
- Multiplayer
- Login/accounts
- Narrative village/trust systems
- AI-generated categories during play
- Additional non-sorting minigames beyond stubs/placeholders
