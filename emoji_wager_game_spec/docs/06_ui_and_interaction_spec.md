# UI and Interaction Specification

## Visual style

Use a minimal, functional card-table aesthetic first.  The game can be abstract.  It does not need character portraits, village trust, quests, or narrative exposition.

The first playable version should prioritize a usable game loop and tests over visual polish.

## Screen flow

Between rounds, show the mode selector, shop, Club betting propositions, resources, and setup controls.

When a sorting round starts, the sorting game should take the whole screen. Hide the shop, mode selector, and betting setup until the round ends.

## Main play screen

The full-screen sorting view should include:

- Active directional zones for the selected mode.
- Visible target glyph groups assigned to each active direction.
- A center prompt glyph.
- A queue/progress indicator.
- Full visible emoji prompt queue under the timer bars.
- Completion timer.
- Countdown bar for Heart safety.
- Countdown bar for the active Club bet, if a bet is active.
- Five visible Heart symbols; lost Hearts remain visible as black/empty Hearts.
- Current Hearts, Diamonds, and Spade payout upgrades.
- Current streak.

The first UI should show only the target glyphs for each group.  Directional category groups should stack vertically on the sides to frame the board.  Category labels, swatches, and explanatory text can be added later if needed.

## Mode select and unlocks

The player should start with 2-way sort unlocked.  3-way sort and 4-way sort should appear in the mode selector as locked purchases.

Locked modes should show their Diamond unlock cost.  After purchase, they should become playable and receive their own memory, target estimates, and mode-specific Spade upgrades.

## Club betting display

Before a round, show five time-to-beat propositions with estimated odds.  Easier/slower targets should pay less; harder/faster targets should pay more:

```text
Conservative  Beat 00:42   1:2
Even          Beat 00:35   1:1
Double        Beat 00:28   2:1
Fivefold      Beat 00:23   5:1
Tenfold       Beat 00:19   10:1
```

Only enable propositions once the selected mode has enough actual history to justify the estimate.  Locked propositions may be visible with the current and required history counts.  The player selects one available offer and buys as many Clubs as desired with Diamonds.  During the round, show the selected target and whether it is still alive.  After the round, show whether the bet paid out and how many Diamonds were won.

## Heart display

Show the Heart safety target separately from the Club bet.  If the active timer passes the Heart safety target, the Heart display should enter a danger state.

## Feedback

Correct answer:

- Glyph visibly moves from the queue/current prompt position to the center, then flies to the selected edge.
- Soft success animation.
- Streak increments.
- Movement and next-entry animations get faster as streak rises.

Wrong answer:

- Glyph visibly moves toward the chosen edge.
- Reject animation.
- Streak resets.
- Glyph slowly returns to the back of the queue.

Winning Club bet:

- Strong positive feedback.
- Show Diamond winnings and odds.

Heart loss:

- Clear but not overly punishing visual feedback.
- Show Hearts lost and why.

## Shop display

The first shop can be simple and functional.  It should include:

- Restore 1 Heart.
- Unlock 3-way sort.
- Unlock 4-way sort.
- Buy global Spade payout upgrade.
- Buy 2-way Spade payout upgrade.
- Buy 3-way Spade payout upgrade.
- Buy 4-way Spade payout upgrade.

Future upgrade slots may be visible but disabled for animation speed, pause breaks, category choice, and category rearrangement.

## Accessibility

- Keyboard-first controls.
- Large directional click zones.
- High-contrast mode should be easy to add.
- Reduced-motion mode should disable long travel animations and use instant movement plus flashes.
- Do not rely only on color to identify correctness.

## Post-round summary

After each round, show a post-round screen or panel with completion time, percentile score, mistakes, Diamond payout, Heart change, and Club bet result.
