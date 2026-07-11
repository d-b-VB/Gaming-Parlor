# UI and Interaction Specification

## Visual style

Use a minimal, functional card-table aesthetic first.  The game can be abstract.  It does not need character portraits, village trust, quests, or narrative exposition.

The first playable version should prioritize a usable game loop and tests over visual polish.

## Screen flow

Between rounds, show the mode selector, shop, Club betting propositions, resources, and setup controls.

When a sorting round starts, the sorting game should take the whole screen. Hide the shop, mode selector, and betting setup until the round ends.  If the player owns study time, start with a pre-round study countdown; the game timer begins when study time expires or the player sorts the first glyph.

## Main play screen

The full-screen sorting view should include:

- Active directional zones for the selected mode.
- Visible target glyph groups assigned to each active direction.
- A center prompt glyph with item timing countdown clocks behind it after item timing history exists; show fastest/elite and meta-median clocks, but keep the slow Heart-loss threshold hidden.
- A queue/progress indicator.
- A prompt queue under the timer bars that shows queue length by default while hiding unrevealed identities.
- Completion timer.
- Countdown bar for Heart safety.
- Countdown bar for the active Club bet, if a bet is active.
- Five visible Heart symbols; lost Hearts remain visible as black/empty Hearts.
- Current Hearts, Diamonds, and total Spade score / expected Diamond payout for the selected mode.
- Current streak.

The first UI should show only the target glyphs for each group.  Directional category groups on the left and right should stack glyphs vertically in tight boxes to frame the board.  The prompt queue should start at the same visual width as the initial countdown bars, then shrink as prompts are removed so the remaining queue becomes visually shorter over time.  By default, hide the identity of unrevealed future queue items while preserving their slots; show the active prompt and any mistaken prompt that has been returned to the queue.  Queue-visibility upgrades reveal additional upcoming prompts.  Category labels, swatches, and explanatory text can be added later if needed.

## Mode select and unlocks

The player should start with 2-way sort unlocked.  3-way sort and 4-way sort should appear in the mode selector as locked purchases.

Locked modes should show their Diamond unlock cost.  After purchase, they should become playable and receive their own memory, target estimates, and mode-specific Spade upgrades.

## Club betting display

Before a round, show five propositions with estimated odds. Each proposition has both a time-to-beat target and a maximum mistake target.  Easier/slower targets should pay less; harder/faster targets should pay more:

```text
Conservative  Beat 00:42   1:2
Even          Beat 00:35   1:1
Double        Beat 00:28   2:1
Fivefold      Beat 00:23   5:1
Tenfold       Beat 00:19   10:1
```

Only enable propositions once the selected mode has enough actual history to justify the estimate.  Locked propositions may be visible with the current and required history counts.  The player selects one available offer and buys as many Clubs as desired with Diamonds.  During the round, show the selected time target, mistake target, and whether the bet is still alive.  After the round, show whether the bet paid out and how many Diamonds were won.

## Heart display

Show the Heart safety target separately from the Club bet.  If the selected mode has no actual completed rounds yet, show that the first run has no Heart timer and let the player take as long as needed.  If the active timer passes an established Heart safety target, the Heart display should enter a danger state.

Once the player is down to the final prompt item in the queue, hide both the Heart safety timer and the active Club bet timer.  The player should still see the queue/final prompt, but the last item should feel like a focused finish rather than a visible timer-checking exercise.

## Feedback

Correct answer:

- Glyph visibly moves from the head of the queue to the center of the table, then smoothly flies to the selected edge.
- Soft success animation.
- Streak increments.
- Movement and next-entry animations get faster as streak rises.
- Show individual-item timing feedback when the item beats the elite item target, beats the meta-median item target, or crosses the hidden slow Heart-loss line, including immediate visual floaters: a +Diamond symbol rises from the center when Diamonds are won, and a -Heart symbol falls from the center when a Heart is lost.
- Behind the center prompt, show stacked item clocks for the fastest/elite and meta-median item timing targets.  Do not show the red slowest timer; the slow Heart-loss threshold should stay hidden except for real-time loss feedback.

Pause and study:

- Study time is automatic before a round and gives the player time to inspect the category layout without running the game timer.
- Pressing Space or the on-screen Pause button consumes one purchased pause, freezes the round timer and item timer, and resumes automatically when pause time expires.

Wrong answer:

- Glyph visibly moves toward the chosen edge.
- Reject animation.
- Streak resets.
- Glyph slowly returns toward the queue before being appended to the back.

Winning Club bet:

- Strong positive feedback.
- Show Diamond winnings and odds.

Heart loss:

- Clear but not overly punishing visual feedback.
- Show Hearts lost and why, including a falling -Heart floater at the moment the loss occurs.

## Shop display

The first shop can be simple and functional.  It should include:

- Restore 1 Heart.
- Unlock 3-way sort.
- Unlock 4-way sort.
- Buy global Spade payout upgrade.
- Buy 2-way Spade payout upgrade.
- Buy 3-way Spade payout upgrade.
- Buy 4-way Spade payout upgrade.
- Buy animation speed upgrades that shorten deliberately weighty glyph travel animations.
- Buy study-time upgrades.
- Buy pause-count and pause-length upgrades.
- Buy queue-visibility upgrades.

Future upgrade slots may be visible but disabled for category choice and category rearrangement.

## Accessibility

- Keyboard-first controls.
- Large directional click zones.
- High-contrast mode should be easy to add.
- Reduced-motion mode should disable long travel animations and use instant movement plus flashes.
- Do not rely only on color to identify correctness.
- Emoji rendering should prefer a preloaded consistent color emoji font, such as Noto Color Emoji, with flag glyphs rendered through a flag emoji asset path, such as Twemoji SVGs, for browsers that display regional indicators as two-letter abbreviations instead of flag emoji.

## Post-round summary

After each round, show a post-round screen or panel with completion time, percentile score, mistakes, Diamond payout, Heart change, and Club bet result.
