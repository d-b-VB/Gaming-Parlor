# Sorting Game Specification

## Mode structure

The first playable build should support three sorting modes:

| Mode | Initial access | Directions | Suggested active groups | Suggested glyphs per group | Suggested prompts |
| --- | --- | --- | --- | --- | --- |
| 2-way sort | Unlocked | left, right | 4 total / 2 per direction | 4 | 16 |
| 3-way sort | Purchased | left, right, up | 6 total / 2 per direction | 4 | 24 |
| 4-way sort | Purchased | left, right, up, down | 8 total / 2 per direction | 4 | 32 |

The 4-way mode matches the original full sorting spec.  The 2-way mode is the starter version and should be the first accessible mode.

The initial prototype should show all active groups around the available directional edges before and during play.  This is a memory/speed game, not a hidden-information game.

The first UI should show only the target glyphs for each group.  Category labels, color swatches, and richer explanations can be added later.

## Controls

Keyboard:

- ArrowLeft sends the center glyph left.
- ArrowRight sends the center glyph right.
- ArrowUp sends the center glyph up when the active mode includes up.
- ArrowDown sends the center glyph down when the active mode includes down.

Mouse/touch:

- Clicking or tapping an active directional zone sends the center glyph in that direction.
- Directions not used by the current mode should not accept dispatches.

## Correct input

When the chosen direction is correct:

1. The center glyph moves toward the selected edge.
2. The streak increases by 1.
3. The next glyph enters the center.
4. Correct movement and next-entry animation should speed up as streak increases.

The timer never pauses unless the player has purchased and triggered a specific pause-break upgrade.

## Wrong input

When the chosen direction is wrong:

1. The center glyph begins moving toward the chosen edge.
2. It is visibly rejected with a brief shake, flash, or bounce.
3. The streak resets to 0.
4. The glyph moves to the back of the queue.
5. The next glyph enters the center.

The timer never pauses unless a purchased pause-break upgrade explicitly says otherwise.

## Queue behavior

Each active glyph starts in the queue once.  Correctly sorted glyphs leave the queue permanently.  Wrongly sorted glyphs are appended to the back of the queue.  The round ends when all active glyphs have been correctly sorted.

## Score

The score is completion time in seconds.  Lower is better.

The game may show mistakes and streaks, but economy, Hearts, and Club betting should use completion time as the scoring value.

## Streak effects

Streak should affect game feel, not correctness.

Suggested first-prototype values:

- Base correct-exit duration: 220 ms.
- Base next-entry duration: 160 ms.
- Each streak step reduces these durations by 3%, capped at 45% reduction.
- Wrong answers reset streak to 0.

Animation-speed upgrades may improve these values later.  Reduced-motion mode should replace long travel animations with short flashes or instant transitions.
