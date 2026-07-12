# Technical Specification

## Stack

Use React, TypeScript, and Vite unless the user specifies otherwise later.

Build from the ground up if the repository does not already contain a runnable app.

## State

Persist all player state to `localStorage`:

- Resources: Hearts, max Hearts, and Diamonds.
- Temporary or pre-round Club stakes.
- Global and mode-specific Spade payout upgrades.
- Other upgrade purchases.
- Unlocked sorting modes.
- Game memories per mode.
- Individual-item timing stats per mode, including fastest item time, longest item time, and recent item timing entries.
- Event log of completed rounds.

The exact memory structure is an implementation concern, but it must support actual entries, rest entries, percentile-at-run tracking, probability-style target estimates, and item-level timing pressure events.

The prototype save is local-only.  It should include visible save metadata such as a local save id, app version, schema version, and last-saved timestamp so players can distinguish one browser/device profile from another.  Do not imply account sync unless a later version adds an explicit import/export or backend sync feature.

## Sorting mode config

Represent sorting modes as data/configuration rather than separate hard-coded games.

Each mode config should include:

- Mode id, such as `sort_2`, `sort_3`, or `sort_4`.
- Display name.
- Active directions.
- Groups per direction.
- Glyphs per group.
- Unlock state and unlock cost.
- Base Diamond payout.
- Starter target defaults.

## Determinism

Use a seedable pseudo-random number generator for round generation.  Store the seed with each round so boards can be reproduced.

## Validation

On app startup:

- Validate that every item has `id`, `glyph`, `name`, `kind`, `tags`, and `colors`.
- Validate that every selector has enough eligible items for at least one mode, or mark it disabled.
- Validate that generated boards have the configured number of groups, configured group size, valid direction assignments, and unique glyphs.

## Suggested modules

```text
src/data/loadCatalog.ts
src/game/modes.ts
src/game/selectors.ts
src/game/generateBoard.ts
src/game/scoring.ts
src/game/memory.ts
src/game/targets.ts
src/game/betting.ts
src/game/economy.ts
src/game/upgrades.ts
src/components/ModeSelect.tsx
src/components/SortingGame.tsx
src/components/ResourceBar.tsx
src/components/DirectionalZone.tsx
src/components/BettingPanel.tsx
src/components/ShopPanel.tsx
src/components/PostRoundSummary.tsx
```

## Testing

Use unit tests for pure logic:

- Selector matching.
- Cross-cutting overlay selectors, including explicit `itemIds` selectors.
- Color exact/contains/excludes behavior.
- Mode config validation.
- Board generation uniqueness for 2-way, 3-way, and 4-way sort.
- Target estimation and percentile-at-run calculation.
- Memory updates, including rest entries for unplayed unlocked modes.
- Individual item timing updates, including elite-percentile Diamond bonuses, percentile-at-run meta-median item payouts, and hidden slow-item Heart losses that soften from current-round failure candidates.
- Per-item median-speed payout upgrades, including bet-history locks and upgrade costs.
- Club bet settlement.
- Spade payout upgrades.
- Purchases and unlocks.

Animation tests are not required for the first prototype, but streak-based animation timing should be deterministic enough to unit-test if it is implemented as a pure helper.
