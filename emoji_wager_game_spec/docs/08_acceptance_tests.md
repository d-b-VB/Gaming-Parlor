# Acceptance Tests

## Data and selectors

- The app loads `data/items.json` without runtime errors.
- The app loads `data/category_selectors.json` without runtime errors.
- A selector with `requiredTags` matches items containing all required tags.
- A selector with `containsColors` matches items containing all requested colors.
- A selector with `excludesColors` rejects items containing excluded colors.
- A selector with `exactColors` only matches items with exactly that color set.

## Modes and unlocks

- 2-way sort is playable in the default state.
- 3-way sort is locked in the default state.
- 4-way sort is locked in the default state.
- Spending the required Diamonds unlocks 3-way sort.
- Spending the required Diamonds unlocks 4-way sort.
- Locked modes cannot be started before purchase.

## Board generation

- A new 2-way sorting round contains exactly 4 groups, 2 directions, and 16 unique glyph prompts.
- A new 3-way sorting round contains exactly 6 groups, 3 directions, and 24 unique glyph prompts.
- A new 4-way sorting round contains exactly 8 groups, 4 directions, and 32 unique glyph prompts.
- Each group contains exactly 4 items.
- Each active direction has exactly 2 groups.
- A glyph never appears in two active groups.
- The generated prompt queue initially contains every active glyph exactly once.
- Board generation is reproducible from a stored seed.

## Gameplay

- Arrow keys dispatch the center glyph in the corresponding active direction.
- Clicking/tapping an active directional zone dispatches the center glyph in that direction.
- Inactive directions do not dispatch in modes that do not use them.
- A correct answer removes that glyph from the queue.
- A wrong answer sends that glyph to the back of the queue.
- The timer does not pause for correct or wrong answers unless a pause-break upgrade explicitly applies.
- A correct streak increments after correct answers.
- A wrong answer resets the streak to zero.
- Streak-based animation acceleration changes game feel but not correctness.
- The round ends only when all active glyphs have been correctly sorted.

## Economy, betting, and memory

- Completion time is recorded as an actual memory entry for the selected mode.
- The run's percentile against prior memory is recorded or derivable.
- Target offers are generated from memory estimates or starter defaults.
- A selected Club bet stores target time, odds, and stake.
- Buying Clubs for a bet spends Diamonds before the round.
- Finishing at or below the selected Club target pays Diamonds based on the odds.
- Finishing above the selected Club target pays no Club winnings.
- A mode with no actual completed rounds has no Heart safety timer, and the first run does not lose Hearts for taking too long.
- Finishing after the Heart safety threshold loses Hearts.
- Finishing worse than every actual memory entry for that mode loses 2 Hearts total.
- Completing one unlocked mode adds rest entries to other unlocked modes.
- Buying a global Spade increases future Diamond payouts for all sorting modes.
- Buying a mode-specific Spade increases future Diamond payouts only for that mode.
- Restoring a Heart spends Diamonds and cannot exceed max Hearts.
- State persists after page reload.

## UI

- The main play UI shows only target glyphs for the active groups in the first prototype.
- The mode selector shows 2-way, 3-way, and 4-way sort.
- The shop exposes Heart restore, mode unlocks, and Spade payout upgrades.

## Non-goals

- The prototype does not need multiplayer.
- The prototype does not need real money.
- The prototype does not need a backend.
- The prototype does not need narrative systems.
- The prototype does not need non-sorting minigames implemented.
