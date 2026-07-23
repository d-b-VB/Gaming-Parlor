# Acceptance Tests

## Data and selectors

- The app loads `data/items.json` without runtime errors.
- The app loads `data/category_selectors.json` without runtime errors.
- A selector with `requiredTags` matches items containing all required tags.
- A selector with `containsColors` matches items containing all requested colors.
- A selector with `excludesColors` rejects items containing excluded colors.
- A selector with `exactColors` only matches items with exactly that color set.

## Modes and unlocks

- Standard 2-way sort is playable in the default state.
- Standard 3-way and Standard 4-way sort are locked in the default state.
- Freeform and Mystery modes are distinct locked games with separate memory and upgrades.
- Spending the required Diamonds unlocks Standard 3-way and Standard 4-way sort.
- Freeform modes become unlockable after all Standard modes are unlocked, in any sequence.
- Mystery modes become unlockable after all Freeform modes are unlocked, in any sequence.
- Locked modes cannot be started before purchase.

## Board generation

- Every 2-way Standard/Freeform/Mystery round contains exactly 4 groups, 2 directions, and 16 unique glyph prompts.
- Every 3-way Standard/Freeform/Mystery round contains exactly 6 groups, 3 directions, and 24 unique glyph prompts.
- Every 4-way Standard/Freeform/Mystery round contains exactly 8 groups, 4 directions, and 32 unique glyph prompts.
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
- The timer does not pause for correct or wrong answers unless a pause upgrade is actively being used.
- The queue hides unrevealed future glyph identities by default while preserving visible queue length.
- Per-game queue-visibility upgrades reveal additional upcoming prompt identities only for that selected game.
- Mistaken glyphs returned to the queue remain visibly identified.
- Study-time upgrades delay the game timer at round start until study expires or the player sorts.
- Pause upgrades let the player pause with Space or a button, freezing round and item timers until the pause expires.
- Once the queue is down to the final prompt item, both the Heart safety countdown and active Club bet countdown are hidden.
- A correct streak increments after correct answers.
- A wrong answer resets the streak to zero.
- Streak-based animation acceleration changes game feel but not correctness.
- The round ends only when all active glyphs have been correctly sorted.

## Economy, betting, and memory

- Completion time is recorded as an actual memory entry for the selected mode.
- Round memory, item timing memory, and event history are never trimmed; all history remains available.
- Mistake count is recorded on actual memory entries for the selected mode.
- A round with at least 2 more mistakes than the prior median mistake count loses 1 Heart.
- A round with more mistakes than the prior maximum mistake count loses 1 additional Heart.
- Correctly sorted individual items record per-item timing entries for the selected mode.
- The first individual item timing entry calibrates fastest/longest item stats without awarding Diamonds or removing Hearts.
- An individual item time slower than the hidden slow danger line removes 1 Heart and gives immediate feedback with a -Heart symbol falling from the center.
- The hidden slow danger line is recalculated for every item, includes current-round item times that already cost Hearts as threshold candidates, and therefore softens after slow-item Heart losses within that round.
- An individual item time at or faster than the elite item threshold awards Diamonds equal to that mode's full-round payout score and shows a +Diamond symbol rising from the center.
- Per-item payout upgrades use the speed corresponding to the median prior percentile-at-run value, not a fixed literal 50th-percentile time.
- The center prompt shows item timing countdown clocks for fastest/elite and meta-median item records once item history exists, and does not show the red slowest timer.
- The run's percentile against prior memory is recorded or derivable.
- Target offers are generated from full-history, curve-scored performance percentile estimates or starter defaults.
- A current high-resolution curve built from all real item timings translates historical performance percentiles back into target times; item rests and wager multiples do not enter that curve.
- Every Club target tier converts exactly fair break-even odds into a performance-percentile target with `chance = 1 / (oddsMultiplier + 1)`: 1:1 uses the median prior percentile, 1:2 uses a 2/3 break-even chance and therefore an easier lower percentile, and higher-profit bets use harder higher percentiles.
- Target offers include a maximum mistake count rounded down toward zero mistakes when fractional.
- A selected Club bet stores target time, odds, and stake.
- Buying Clubs for a bet spends Diamonds before the round.
- Finishing at or below the selected Club time target and at or below the selected mistake target pays Diamonds based on the odds.
- Winning Club bets add extra actual memory entries equal to floor(net bet profit / starting bank), and those entries can affect later Heart safety and Club target estimates.
- Finishing above the selected Club time target or above the selected mistake target pays no Club winnings.
- A mode with no actual completed rounds has no Heart safety timer, and the first run does not lose Hearts for taking too long.
- First-round actual time and several derived item-pace calibration scores are stored as temporary calibration entries; derived ingredients slower than the actual first-round time are dropped and identical scores are deduplicated.
- First-round item-pace calibration must include animation/transition overhead by allocating non-item elapsed round time across item times before scaling item statistics to whole-round scores.
- Later actual rounds remove derived temporary calibration entries one at a time before retiring the actual first-round calibration entry, gradually replacing pseudo data with real scores.
- Heart safety follows staged calibration for every mode using real runs plus the overhead-adjusted first-round pseudo-scores; bet-weighted duplicate entries must not count as extra actual runs for Heart safety, new-worst Heart penalties, or mistake-pressure baselines.
- Finishing after the Heart safety threshold loses Hearts.
- Finishing worse than every actual memory entry for that mode loses 2 Hearts total.
- Completing a full round in a mode starts or continues an away block for every other unlocked mode with timed records. Each such non-active mode receives at most one marked `rest` per away block.
- Round rests copy the rested mode's current slowest round time and highest mistake count, and item rests copy the mode's 16/24/32 slowest item timings with percentiles recalculated at load time.
- Rest entries are visible in debug records and are used for Club timing/history availability, round Heart safety, mistake pressure, and individual item timing as a counterweight to high-stakes weighted fast entries.
- Buying a global Spade increases future Diamond payouts for all sorting modes.
- Buying a mode-specific Spade increases future Diamond payouts only for that mode.
- Buying a per-game animation speed upgrade spends Diamonds and shortens deliberately weighty glyph travel animations for that game without changing sorting correctness.
- Buying per-item meta-median payout upgrades is more accessible: level cost is 8×/12×/16× the corresponding mode Spade cost for 2-way/3-way/4-way sort.
- Buying per-game study-time, pause-count, pause-length, and queue-visibility upgrades spends Diamonds and increments the corresponding upgrade level only for that game.
- Buying a Standard-only sorted-item display upgrade per base size shows all correctly sorted items in the Standard category zones.
- Restoring a Heart spends Diamonds and cannot exceed max Hearts.
- State persists after page reload.

## UI

- Editing the Club stake input does not rerender the whole screen or jump focus back to the top.
- The main play UI shows only target glyphs for the active groups in the first prototype.
- The mode selector shows all nine Standard, Freeform, and Mystery 2/3/4-way games.
- The shop exposes Heart restore, mode unlocks, Spade payout upgrades, per-game animation speed, per-game study time, per-game pauses, per-game queue-visibility upgrades, and Standard sorted-item display upgrades.

## Non-goals

- The prototype does not need multiplayer.
- The prototype does not need real money.
- The prototype does not need a backend.
- The prototype does not need narrative systems.
- The prototype does not need non-sorting minigames implemented.
