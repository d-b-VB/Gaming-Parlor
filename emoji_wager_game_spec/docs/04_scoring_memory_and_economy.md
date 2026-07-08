# Scoring, Memory, and Economy

## Score direction

For sorting, lower time is better.

## Game memory

Each sorting mode has its own fixed-size memory of recent score entries.  Use 20 entries per mode in the first prototype.

Each memory entry should include enough information to support future probability estimates, for example:

- `gameId` or mode id, such as `sort_2`, `sort_3`, or `sort_4`.
- `timeSeconds`.
- `entryType`: `actual` or `rest`.
- `createdAt`.
- `percentileAtRun`, if available after the run is scored against the prior memory.
- round metadata such as mistakes, seed, selected Club target, and active upgrades when useful.

The exact persisted structure is an implementation concern, but it must support probability-style target estimation rather than a hard-coded 25th percentile Club line.

Actual entries come from completed rounds.  Rest entries are artificial easing entries applied to unplayed unlocked modes.

## Updating memory after a completed round

When the player completes game mode `G` with time `T`:

1. Score `T` against `G`'s pre-round memory and record the percentile outcome for the run.
2. Add an `actual` memory entry with time `T` to game `G`.
3. For every other unlocked game mode, add a `rest` entry equal to that other mode's current worst remembered time.
4. Trim each mode's memory to the most recent 20 entries.

## Item timing pressure

In addition to whole-round completion time, record the elapsed time for each correctly sorted prompt item.

- The first recorded item time calibrates item timing and should not itself trigger a fastest or slowest reward/penalty.
- If a later item time is slower than the player's previous longest recorded item time for that mode, immediately lose 1 Heart.
- If a later item time is faster than the player's previous fastest recorded item time for that mode, immediately award Diamonds equal to that mode's current Spade score / base round payout before Heart penalties.
- Store recent item timing entries with item id, elapsed seconds, timestamp, and whether the entry created a fastest or longest record.
- Use the per-mode fastest, median, and longest item times as live item countdown references in the play UI.

For a prototype with only one unlocked mode, step 3 has no visible effect until more modes are unlocked.

## Mistake pressure

Record the number of wrong dispatches on every completed round.  Compare each new round against prior actual rounds for that mode:

- If the round has at least 2 more mistakes than the prior median mistake count, lose 1 Heart.
- If the round has more mistakes than the prior maximum mistake count, lose 1 additional Heart.
- The first actual round for a mode records mistakes but does not lose Hearts from mistake pressure because there is no prior baseline.

## Animation speed upgrades

Animation speed upgrades are Diamond purchases that make glyph travel/rejection animations shorter.  They should not change board correctness, timer math, payouts, or item timing thresholds; they only reduce animation waiting time between player actions.

## Why rest entries exist

Yes: the documentation mentions rests as the mechanism that rewards rotating between games.

Rest entries are not punishments and should not be described as bad scores.  They represent expectations cooling off while a mode is neglected.  They lower the bar for Heart safety and Club betting targets when the player returns, encouraging the player to rotate between 2-way, 3-way, and 4-way sorting instead of grinding only one mode forever.

## Target estimation

Do not treat the 25th percentile as the required Club threshold.  Instead, track how each run compares to memory, then estimate time targets for different chance levels.

For the first prototype, generate five pre-round target offers with harder times paying more:

- **1:2** conservative proposition.
- **1:1** even proposition.
- **2:1** double proposition.
- **5:1** long-shot proposition.
- **10:1** extreme proposition.

Lower target times must have higher payouts.  A proposition should only become available once that mode has enough actual history to statistically justify showing the odds.  The UI may show unavailable propositions as locked, with the required history count.  The implementation can start with empirical percentiles over recent actual/rest memory, then improve later.  The UI should frame these as estimates, not guarantees.

## Heart safety threshold

Heart loss still needs a clear safety line.  The first prototype may use the estimated 50% target, median remembered time, or a slightly easier line as the Heart safety threshold.  The chosen approach should be centralized in scoring configuration and covered by tests.

If a mode has no actual completed rounds yet, the first round for that mode should have no Heart safety timer and no Heart loss for taking too long.  It is a calibration run; let the player take as long as needed.  After at least one actual score exists but fewer than 5 memory entries exist for a mode, use starter defaults per mode.

Suggested starter defaults:

| Mode | Safe / 50% target | Sharp / 25% target | Long-shot / 10% target | Heart safety |
| --- | ---: | ---: | ---: | ---: |
| 2-way sort | 35s | 28s | 22s | 45s |
| 3-way sort | 50s | 40s | 32s | 65s |
| 4-way sort | 70s | 55s | 45s | 90s |

## Round outcome

Given completion time `T`:

- Record the actual time and percentile outcome.
- Award base Diamonds plus Spade payout bonuses.
- Settle any selected Club bet.
- Lose Hearts if `T` is worse than the Heart safety threshold.

## New worst time

If `T` is worse than every actual score currently in that mode's memory, lose 2 Hearts total instead of 1 Heart.  Rest entries do not count as actual scores for this comparison.

## Diamond payout

Suggested first-prototype formula before Club bet settlement:

```text
baseDiamonds = modeBaseDiamonds
spadeBonus = globalSpades + modeSpecificSpades[mode]
heartPenalty = T > heartSafetyThreshold ? -1 : 0
payout = max(0, baseDiamonds + spadeBonus + heartPenalty)
```

Suggested mode base payouts:

- 2-way sort: 2 Diamonds.
- 3-way sort: 3 Diamonds.
- 4-way sort: 4 Diamonds.

The UI should show this total expected per-round payout before a round starts as the mode's **Spade score**:

```text
spadeScore = modeBaseDiamonds + globalSpades + modeSpecificSpades[mode]
```

## Club betting and payout

Clubs are bought as a stake before the round.  A Club bet should include:

- Target time to beat.
- Odds multiplier.
- Stake size in Clubs purchased with Diamonds.
- Diamond cost per Club.

Suggested first-prototype settlement:

```text
if completionTime <= selectedTarget:
  diamondWinnings = clubStake + floor(clubStake * oddsMultiplier)
else:
  diamondWinnings = 0
```

The Club purchase cost is paid before the round.  On a winning bet, return the stake plus the odds profit.  For the 1:2 proposition, only accept stakes in multiples of 2; for example, a 4-Club stake returns the 4-Club stake plus 2 Diamonds of profit when it wins.  The odds should increase as the target becomes harder to beat.

## Purchases and upgrades

First-prototype purchases:

- Restore 1 Heart: 5 Diamonds.
- Unlock 3-way sort: 15 Diamonds.
- Unlock 4-way sort: 30 Diamonds.
- Buy 1 global Spade payout upgrade: cost starts at 25 Diamonds and increases by 1.6x per global Spade, rounded up.
- Buy 1 2-way Spade payout upgrade: cost starts at 12 Diamonds and increases by 1.5x per 2-way Spade, rounded up.
- Buy 1 3-way Spade payout upgrade: cost starts at 9 Diamonds and increases by 1.5x per 3-way Spade, rounded up.
- Buy 1 4-way Spade payout upgrade: cost starts at 6 Diamonds and increases by 1.5x per 4-way Spade, rounded up.
- Increase max Hearts by 1: cost starts at 20 Diamonds and doubles each time.

Future upgrade families:

- Faster glyph travel and entry animations.
- Pause breaks within a round.
- Category choice before a round.
- Category rearrangement before a round.

These numbers are placeholders and should be constants in one economy config file.
