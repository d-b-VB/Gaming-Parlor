# Product Brief

## Core idea

A single-player abstract game where the player repeatedly performs short, objectively scored skill tests and uses an in-game economy to bet on their own improvement.

The game does not need a narrative wrapper.  It can look like a clean card-table interface built around Hearts, Diamonds, Clubs, and Spades.

## Initial game modes

The first playable build should focus on an emoji sorting family with three modes:

1. **2-way sort**: available immediately and used as the onboarding mode.
2. **3-way sort**: locked at first and purchased with Diamonds.
3. **4-way sort**: locked at first and purchased with Diamonds.

Each sorting mode displays visible groups of glyphs.  One glyph appears in the center at a time, and the player sends it to the matching direction.  The round score is completion time, and lower is better.

The 2-way mode should be easiest, 3-way should add a meaningful memory/input burden, and 4-way should be the highest-difficulty initial mode.  Unlock costs and mode-specific Spade upgrade costs should recognize this difficulty spread.

## Player motivation

The player is not just trying to get a high score.  The player is trying to understand when their current ability is better than the game's estimate of their likely performance.

Before a round, Club betting offers present time-to-beat targets and odds.  The player buys as many Clubs as they want at those odds.  If the player beats the selected target, the Clubs pay out as Diamonds according to the odds; otherwise the Club stake is lost.

When the player improves faster than the memory model updates, aggressive Club bets become profitable.  When the player declines or has a bad round, Heart risk appears.

## Emotional loop

1. Learn the board.
2. Enter a flow state.
3. Choose a Club target that feels beatable but exciting.
4. Beat the target and convert the bet into Diamonds.
5. Raise the personal benchmark.
6. Eventually face pressure from the higher benchmark.
7. Rotate to another game mode to let the first mode's expectations cool.
8. Return to exploit the softened benchmark.
