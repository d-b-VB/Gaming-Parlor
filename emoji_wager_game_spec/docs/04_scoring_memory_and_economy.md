# Scoring, Memory, and Economy

## Score direction

For sorting, lower time is better.

## Game memory

Each sorting mode keeps a long performance memory.  The prototype may use a high safety cap such as 2,000 entries per mode for localStorage practicality, but gameplay odds should not be designed around a tiny fixed memory such as 20 entries.

Each memory entry should include enough information to support future probability estimates, for example:

- `gameId` or mode id, such as `sort_2`, `sort_3`, or `sort_4`.
- `timeSeconds`.
- `entryType`: `actual` or `rest`.
- `createdAt`.
- `percentileAtRun`, if available after the run is scored against the prior memory.
- round metadata such as mistakes, seed, selected Club target, and active upgrades when useful.

The exact persisted structure is an implementation concern, but it must support probability-style target estimation from recent rest-adjusted performance percentiles rather than a hard-coded 25th percentile Club line or a speed target averaged across all historical data.

Actual entries come from completed rounds.  Rest entries are artificial easing entries applied to unlocked modes with existing records while the player completes full rounds in other modes.

## Updating memory after a completed round

When the player completes game mode `G` with time `T`:

1. Score `T` against `G`'s pre-round memory and record the percentile outcome for the run.
2. Add an `actual` memory entry with time `T` to game `G`.
3. If this completion begins or continues an away block for other unlocked modes with existing timed records, add at most one `rest` entry per away block to each such non-active mode.  For example, a block of several 3-way rounds after 2-way play gives 2-way one rest, not one rest per 3-way round.
4. A round-level rest uses the rested mode's slowest current round time and highest current mistake count, counting any timed actual, temporary calibration, or prior rest entry that is still present and excluding bet-weighted duplicates.
5. An item-level rest also copies the rested mode's 16/24/32 slowest item timing records for 2-/3-/4-way sort.  Preserve item ids when present, mark the new entries as `rest`, and compute each percentile at the time the rest is loaded against the current item timing history.
6. Keep long memory history, trimming only to a high storage safety cap if needed.

## Item timing pressure

In addition to whole-round completion time, record the elapsed time for each correctly sorted prompt item.

- The first recorded item time calibrates item timing and should not itself trigger a fastest or slowest reward/penalty.
- If a later item time is slower than the hidden slow-item danger line, immediately lose 1 Heart.  Recalculate this threshold for every item from full item history plus current-round slow failures.  Safe central measures such as mean, median, trimmed mean, midhinge, and meta-median must remain safe.  Compute slow candidates such as `2 × trimmed mean`, `Q3 + 1.5 × IQR`, `mean + 2 × SD`, the mode target-tail percentile, prior slowest item time, and every current-round item time that already cost a Heart; use the median of those candidates, floored by the safe central measures.  Do not show this exact slow threshold; show real-time Heart-loss feedback when it is crossed.
- If a later item time beats the elite item target, immediately award Diamonds equal to that mode's current Spade score / base round payout before Heart penalties.  The elite target starts as the top 1% item-speed threshold over the full item history, which behaves like the fastest item for roughly the first 100 item records without becoming permanently impossible afterward.
- Store full item timing history with item id, elapsed seconds, timestamp, percentile-at-run, and whether the entry created a fastest, longest, or elite result.
- The repeatable per-item payout upgrade should use a meta-median target: take the median of prior item percentile-at-run values, then convert that percentile back into a target speed using the full item-time history.  This makes the reward reflect how the player has actually been performing over time instead of assuming a fixed 50/50 median.
- Use the per-mode fastest and meta-median item times as live item countdown references in the play UI.  Keep the hidden slow Heart-loss threshold hidden; do not render the red slowest timer.

## First-round calibration pseudo-scores

The first completed round in a mode should remain non-punitive, but it should not invite sandbagging.  Store the actual first-round time and item-pace pseudo-scores as temporary calibration entries.  Candidate pseudo-score ingredients include second-half pace ×2, last-quarter pace ×4, exponentially weighted item pace, last-half median item pace, midhinge item pace, narrowest-window modal item pace for all items, and narrowest-window modal item pace for the second half.  Item timing records only prompt decision time, so before scaling any item-time ingredient to a whole-round score, allocate the first round's non-item elapsed time (animation, transition, and other overhead) evenly across the item times.  Drop any ingredient slower than the actual first-round time, deduplicate identical scores, and store the remaining derived ingredients as temporary first-round calibration scores.  Remove derived temporary calibration entries one at a time before retiring the actual first-round calibration entry, so the pseudo data set is gradually replaced by real scores.

For a prototype with only one unlocked mode, away-block rests have no visible effect until more modes are unlocked and completed.

## Mistake pressure

Record the number of wrong dispatches on every completed round.  Compare each new round against prior actual rounds for that mode:

- If the round has at least 2 more mistakes than the prior median mistake count, lose 1 Heart.
- If the round has more mistakes than the prior maximum mistake count, lose 1 additional Heart.
- The first actual round for a mode records mistakes but does not lose Hearts from mistake pressure because there is no prior baseline.

## Animation speed upgrades

Glyph movement should be a meaningful part of round time: a prompt travels from the hidden queue to the center, then to the selected category, or slinks back to the queue on a mistake.  Correct-move duration should be tied roughly to the mode's median item timing; mistake-return duration should be tied roughly to the slow/longest item timing so errors feel expensive.  Animation speed upgrades are Diamond purchases that shorten those travel/rejection animations.  They do not change board correctness, payouts, or item timing thresholds, but because the player waits for movement before the next prompt, faster glyphs materially improve achievable round times.

## Why rest entries exist

Yes: the documentation mentions rests as the mechanism that rewards rotating between games.

Rest entries are not punishments and should not be described as bad scores.  They represent expectations cooling off while a mode is neglected.  Rest entries are marked as `rest`, visible in debug records, and used everywhere a normal non-bet timing baseline is used: Club target timing and history availability, round-level Heart safety, mistake pressure, and individual item timing.  This encourages the player to rotate across all unlocked Standard, Freeform, and Mystery 2/3/4-way games instead of grinding only one mode forever.

## Target estimation

Do not treat the 25th percentile as the required Club threshold.  Instead, track how each run compares to memory, then estimate time targets for different chance levels.

For the first prototype, generate five pre-round target offers with harder times paying more:

- **1:2** conservative proposition.
- **1:1** even proposition.
- **2:1** double proposition.
- **5:1** long-shot proposition.
- **10:1** extreme proposition.

Lower target times must have higher payouts.  A proposition should only become available once that mode has enough timed non-bet history, including rests and temporary calibration records, to statistically justify showing the odds.  The UI may show unavailable propositions as locked, with the required history count.  The implementation can start with empirical percentiles over recent actual/rest memory, then improve later.  The UI should frame these as estimates, not guarantees.

## Heart safety threshold

Heart loss still needs a clear safety line.  Use real completed runs, the overhead-adjusted first-round calibration pseudo-scores, and rest entries for the Heart safety sequence.  Bet-weighted duplicate entries can influence confidence weighting but do not set the early Heart timer.  The actual first-round calibration entry remains separate until it is eventually retired after the derived temporary pseudo-scores.

For every game mode:

| Timed non-bet entries before this round | Heart safety threshold |
| ---: | --- |
| 0 | Infinite; no Heart timer and no Heart loss for taking too long. |
| 1 | Prior run time × 2. |
| 2 | Slowest of the first 2 runs. |
| 3 | Median time of the first 3 runs. |
| 4 | Second slowest of the first 4 runs. |
| 5+ | Simple median of timed non-bet entries. |

## Round outcome

Given completion time `T`:

- Record the actual time and percentile outcome.
- Award base Diamonds plus Spade payout bonuses.
- Settle any selected Club bet.
- Lose Hearts if `T` is worse than the Heart safety threshold.

## New worst time

If `T` is worse than every non-bet score currently in that mode's memory, including rests, lose 2 Hearts total instead of 1 Heart.  Bet-weighted duplicates and individual unaggregated calibration ingredients do not count for this comparison.

## Diamond payout

Suggested first-prototype formula before Club bet settlement:

```text
baseDiamonds = modeBaseDiamonds
spadeBonus = globalSpades + modeSpecificSpades[mode]
heartPenalty = T > heartSafetyThreshold ? -1 : 0
payout = max(0, baseDiamonds + spadeBonus + heartPenalty)
```

Suggested mode base payouts:

- Standard 2-way/3-way/4-way sort: 2/3/4 Diamonds.
- Freeform 2-way/3-way/4-way sort: 4/6/8 Diamonds.
- Mystery 2-way/3-way/4-way sort: 8/12/16 Diamonds.

The UI should show this total expected per-round payout before a round starts as the mode's **Spade score**:

```text
spadeScore = modeBaseDiamonds + globalSpades + modeSpecificSpades[mode]
```

## Club betting and payout

Clubs are bought as a stake before the round.  A Club bet should include:

- Target time to beat.
- Maximum mistakes allowed.
- Odds multiplier.
- Stake size in Clubs purchased with Diamonds.
- Diamond cost per Club.

Suggested first-prototype settlement:

```text
if completionTime <= selectedTimeTarget and mistakes <= selectedMistakeTarget:
  diamondWinnings = clubStake + floor(clubStake * oddsMultiplier)
else:
  diamondWinnings = 0
```

The Club purchase cost is paid before the round.  On a winning bet, return the stake plus the odds profit.  For the 1:2 proposition, only accept stakes in multiples of 2; for example, a 4-Club stake returns the 4-Club stake plus 2 Diamonds of profit when it wins.  The odds should increase as the target becomes harder to beat.  Mistake targets should be estimated from prior non-bet mistake counts for the same mode, including rests.  Easier odds may allow more mistakes, while harder odds should trend toward zero mistakes.  If an estimate lands between two mistake counts, round down toward zero so the player must meet the stricter mistake target.  On a winning bet, compute net bet profit, divide it by the player's starting bank before the stake purchase, round down, and add that many extra actual memory entries for the winning time and mistakes.  This makes high-bankroll, high-odds wins count as stronger evidence of true performance.  Rest entries should persist in the target-estimation window as a counterweight to those fast weighted wins, so rotating away from a mode can still cool expectations.

## Purchases and upgrades

First-prototype purchases:

- Restore 1 Heart: 5 Diamonds.
- Unlock Standard 3-way sort: 15 Diamonds.
- Unlock Standard 4-way sort: 30 Diamonds.
- After all Standard modes are unlocked, unlock Freeform 2/3/4-way modes in any sequence.
- After all Freeform modes are unlocked, unlock Mystery 2/3/4-way modes in any sequence.
- Buy 1 global Spade payout upgrade: cost starts at 25 Diamonds and increases by 1.6x per global Spade, rounded up.
- Buy 1 mode-specific 2-way Spade payout upgrade: cost starts at 12 Diamonds and increases by 1.5x per mode Spade, rounded up.
- Buy 1 mode-specific 3-way Spade payout upgrade: cost starts at 9 Diamonds and increases by 1.5x per mode Spade, rounded up.
- Buy 1 mode-specific 4-way Spade payout upgrade: cost starts at 6 Diamonds and increases by 1.5x per mode Spade, rounded up.
- Buy repeatable per-item meta-median-speed payout upgrades after making at least one Club bet in that mode.  Each level pays +1 Diamond for each item solved faster than that mode's percentile-at-run meta-median item target.  Level cost is 8× the corresponding mode Spade cost for 2-way sort, 12× for 3-way sort, and 16× for 4-way sort, using the upgrade level as the Spade-cost level.
- Buy study time: each level adds 1 automatic pre-round second for reading categories before the timer starts; sorting any glyph starts the timer early.
- Buy pauses per round: each level adds 1 player-triggered pause during a round.
- Buy pause length: each level adds 1 second to each pause.
- Buy queue visibility: the queue starts hidden except for the active prompt and mistaken returned glyphs; each level reveals one additional upcoming prompt.
- Increase max Hearts by 1: cost starts at 20 Diamonds and doubles each time.

Future upgrade families:

- Category choice before a round.
- Category rearrangement before a round.

These numbers are placeholders and should be constants in one economy config file.
