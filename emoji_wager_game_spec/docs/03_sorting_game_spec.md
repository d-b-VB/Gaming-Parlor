# Sorting Game Specification

## Mode structure

The playable build supports eighteen distinct sorting games: single-item and Multi-Item interactions for each Standard, Freeform, and Mystery 2-way, 3-way, and 4-way sort. Each game keeps separate memory, bets, rests, item timing, and mode upgrades.

| Mode family | Initial access | Directions | Active groups | Glyphs per group | Prompts | Base payout |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Standard 2-way sort | Unlocked | left, right | 4 total / 2 per direction | 4 | 16 | 2 |
| Standard 3-way sort | Purchased | left, right, up | 6 total / 2 per direction | 4 | 24 | 3 |
| Standard 4-way sort | Purchased | left, right, up, down | 8 total / 2 per direction | 4 | 32 | 4 |
| Freeform 2/3/4-way sort | Purchased after all Standard modes are unlocked | same sizes as Standard | 2 per direction | 4 | 16/24/32 | 2× Standard |
| Mystery 2/3/4-way sort | Purchased after all Freeform modes are unlocked | same sizes as Standard | 2 per direction | 4 | 16/24/32 | 4× Standard |
| Multi-Item Standard/Freeform/Mystery | Parallel progression after Standard 4-way | same as corresponding single-item game | 2 per direction | 4 | 16/24/32 shown together | 2× corresponding single-item payout |

Standard Sort is the current labeled-by-example game: category names are not shown, but the target example glyphs for each group are visible in their direction zones.  A Standard-only per-size upgrade can additionally show every correctly sorted item in its category zone.

Freeform Sort keeps the same hidden categories and only uses the established directions.  The first correctly placed item from an unassigned category claims any still-open category slot in the chosen direction; later items from that category must follow that established direction.  If a direction already has its two categories assigned, another unassigned category cannot be placed there.  Freeform board generation must be especially strict about preventing overlapping active categories.

Mystery Sort has predetermined category directions, but the category example glyphs are hidden.  Correctly sorted items reveal themselves in the relevant category zone; wrong guesses reveal only the mistaken item in the queue, not the hidden category.

## Multi-Item interaction

Multi-Item games render every remaining item from the beginning, scattered across both horizontal and vertical axes with varied rotation, depth, and shadows to resemble a three-dimensional tabletop pile. Items may overlap, but only the top item at an occupied position is selectable. Selecting it lifts it into the player's hand and exposes the item below it; selecting a held item returns it to the pile. The hand starts at two items and has a separate capacity upgrade in every Multi-Item game.

After selecting one or more items, the player chooses a direction. The batch sorts only when every held item belongs in that direction. If any item is wrong, the whole batch returns to the pile, one mistake is recorded, and no hidden category is revealed. A correct Freeform batch may establish multiple previously unassigned categories when the chosen direction has enough open category slots.

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
