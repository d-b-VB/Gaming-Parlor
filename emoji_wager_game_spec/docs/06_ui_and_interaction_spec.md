# UI and Interaction Specification

## Visual style

Use a minimal, functional card-table aesthetic first.  The game can be abstract.  It does not need character portraits, village trust, quests, or narrative exposition.

The first playable version should prioritize a usable game loop and tests over visual polish.

## Main play screen

The main sorting screen should include:

- Active directional zones for the selected mode.
- Visible target glyph groups assigned to each active direction.
- A center prompt glyph.
- A queue/progress indicator.
- Completion timer.
- Current Club bet target and odds, if a bet is active.
- Heart safety indicator.
- Current Hearts, Diamonds, and Spade payout upgrades.
- Current streak.

The first UI should show only the target glyphs for each group.  Category labels, swatches, and explanatory text can be added later if needed.

## Mode select and unlocks

The player should start with 2-way sort unlocked.  3-way sort and 4-way sort should appear in the mode selector as locked purchases.

Locked modes should show their Diamond unlock cost.  After purchase, they should become playable and receive their own memory, target estimates, and mode-specific Spade upgrades.

## Club betting display

Before a round, show a small set of time-to-beat offers with estimated odds, for example:

```text
Safe     Beat 00:35   1.5x
Sharp    Beat 00:28   2.5x
Longshot Beat 00:22   5.0x
```

The player selects one offer and buys as many Clubs as desired with Diamonds.  During the round, show the selected target and whether it is still alive.  After the round, show whether the bet paid out and how many Diamonds were won.

## Heart display

Show the Heart safety target separately from the Club bet.  If the active timer passes the Heart safety target, the Heart display should enter a danger state.

## Feedback

Correct answer:

- Glyph moves to edge.
- Soft success animation.
- Streak increments.
- Movement and next-entry animations get faster as streak rises.

Wrong answer:

- Glyph starts toward chosen edge.
- Reject animation.
- Streak resets.
- Glyph returns to back of queue.

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
