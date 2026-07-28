# Emoji Wager Game Specification Package

This repository is a Codex-ready specification package for a browser-based, single-player, abstract skill-and-wager game.

The first implemented family of minigames is **emoji sorting** with 2-way, 3-way, and 4-way sizes:

- **2-way sort**: the starter mode and the only mode accessible at the beginning.
- **3-way sort**: locked at first and purchased with Diamonds.
- **4-way sort**: locked at first and purchased with Diamonds.

Each size supports Standard, Freeform, and Mystery rules in both single-item and Multi-Item interaction styles. Single-item games show one prompt at a time; Multi-Item games show all remaining prompts in selectable piles. The player dispatches with keyboard directions or directional clicks/taps. Completion time is the score, and lower is better.

The game has four suit concepts:

- **Hearts**: tolerance for slow or deteriorating performance.
- **Diamonds**: liquid currency used for recovery, unlocks, upgrades, and payouts.
- **Clubs**: gambling tokens bought before a round at selected odds; winning Club bets pay Diamonds.
- **Spades**: shorthand for upgrades, including general payout upgrades, mode-specific payout upgrades, animation speed upgrades, pause breaks, and category-control upgrades.

Read all documents in `/docs` before implementing.  Treat `docs/08_acceptance_tests.md` as the definition of done for the first playable version.

## Suggested stack

- React + TypeScript + Vite
- Local state persisted in `localStorage`
- Seeded pseudo-random round generation
- Unit tests for selectors, board generation, memory, betting, upgrades, and scoring
- No backend, no authentication, no real-money wagering

## Important data files

- `data/items.json`: flat glyph catalog with descriptive tags and colors.
- `data/category_selectors.json`: curated selectors used to form sorting groups.
- `data/default_state.json`: starter resource, unlock, upgrade, and memory state.
