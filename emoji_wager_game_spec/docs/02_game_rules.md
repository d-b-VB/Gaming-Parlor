# Game Rules and Suit Meanings

## Hearts

Hearts are the player's tolerance for slow or deteriorating performance.

A Heart is lost when the player finishes after the Heart safety threshold for the current round.  The first actual round in a mode is a calibration run with no Heart timer and no Heart loss for taking too long.  If the player runs out of Hearts, the first prototype should show a simple game-over or reset panel.  Do not delete history automatically unless the user chooses reset.

Hearts are not village trust, hit points in combat, or physical health.  They are an abstract loss buffer.

## Diamonds

Diamonds are liquid currency.

Diamonds can be used to:

- Restore Hearts.
- Increase maximum Hearts.
- Unlock 3-way sort and 4-way sort.
- Buy Clubs for a pre-round wager.
- Buy Spade upgrades.
- Buy sorting-game animation upgrades, pause-break upgrades, and category-control upgrades.
- Unlock additional game types in future versions.

The first prototype should implement at least restoring Hearts, unlocking sorting modes, buying Clubs for a round, and buying Spade payout upgrades.  Other upgrades can be visible but disabled.

## Clubs

Clubs are gambling tokens, not a long-term score currency.

Before a round, the player chooses a time-to-beat target with displayed odds.  The player may buy as many Clubs as they can afford at those odds.  At the end of the round:

- If the completion time is at or below the chosen target, the Club bet pays Diamonds based on the odds.
- If the completion time is above the chosen target, the Club stake is lost and pays nothing.

Clubs do not need to persist as a banked currency between rounds unless the implementation uses a temporary pre-round stake object.  All wagering language is metaphorical and uses only in-game resources.

## Spades

Spades are shorthand for upgrades.

The initial Spade upgrade family should include payout upgrades:

- **Global Spades**: add +1 Diamond payout to every sorting round.
- **2-way Spades**: add +1 Diamond payout to 2-way sort rounds only.
- **3-way Spades**: add +1 Diamond payout to 3-way sort rounds only.
- **4-way Spades**: add +1 Diamond payout to 4-way sort rounds only.

Example: if the player buys +1 global Spade and +1 3-way Spade, then each 3-way sort round pays +2 Diamonds before other modifiers.

Show the resulting total payout before each game as that mode's Spade score.  The starter Spade scores are 2 for 2-way sort, 3 for 3-way sort, and 4 for 4-way sort before upgrades.

Mode-specific Spade pricing should be cheaper than global Spades.  Harder modes should have cheaper mode-specific payout upgrades: 3-way Spades should cost less than 2-way Spades, and 4-way Spades should cost less than 3-way Spades.

Additional Spade-style upgrades can include:

- Faster glyph travel and entry animations.
- Pause breaks within the game.
- Opportunities to choose categories before a round.
- Opportunities to rearrange categories before a round.

These upgrades should not be required for the first minimal playable build, but the state model should leave room for them.

## No real-money wagering

All wagering language is metaphorical and uses only in-game resources.  There is no real-money wagering, cash-out, backend account, or multiplayer market.
