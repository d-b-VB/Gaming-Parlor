# Content Generation

## Data philosophy

Items are not arranged into a tidy taxonomy.  Each item has many descriptive tags.  Tags are cross-cutting and non-exclusive.

A penguin can be `animal`, `bird`, `vertebrate`, `polar`, `cold`, `land`, `sea`, `black`, and `white`.

A flag can be `flag`, `island`, `Europe`, `subpolar`, `cross`, and have colors `blue`, `red`, and `white`.

## Items

Each item in `data/items.json` has:

- `id`: stable string identifier.
- `glyph`: displayed symbol.
- `name`: human-readable name.
- `kind`: `emoji`, `flag`, or `symbol`.
- `tags`: flat descriptive tags.
- `colors`: atomic colors where relevant.

## Selectors

Groups are built from selectors.  A selector may require tags, exclude tags, require colors, exclude colors, require exact colors, require color count, or limit item kind.

Examples:

```json
{ "requiredTags": ["arthropod"] }
```

```json
{ "exactColors": ["red", "white"] }
```

```json
{ "containsColors": ["red"], "excludesColors": ["blue"] }
```

## Board generation algorithm

1. Load curated selectors from `data/category_selectors.json`.
2. Filter to selectors with at least 4 eligible items.
3. Read the active mode config to determine direction count, group count, and prompt count.
4. Pick the required number of selectors for the board: 4 for 2-way, 6 for 3-way, or 8 for 4-way.
5. Prefer known opposite pairs across opposite directions when possible.
6. For each selector, choose 4 unique items.
7. No glyph may appear twice on the same board.
8. Avoid choosing an item for one group if it also matches another active group, unless no valid board can be generated after retries.
9. If generation fails, retry with different selectors.
10. Use a seedable pseudo-random number generator so bad boards can be reproduced.

## Direction assignment

Each active direction gets two groups.

2-way sort should use left and right.  3-way sort should use left, right, and up.  4-way sort should use left, right, up, and down.

If opposite selector pairs are chosen, assign them to opposite directions when possible:

- hot vs cold
- polar vs tropical/equatorial
- island vs landlocked
- sea vs land
- horizontal stripes vs vertical stripes

## Ambiguity policy

Avoid active groups that create obvious confusion.  For example, do not place `cold`, `polar`, and `blue_white_exact` on the same board if many selected glyphs would plausibly match multiple groups.

The player should lose because of speed and memory, not because the category map is arguable.

For the first playable UI, show only the target glyphs in each group.  If this creates too much ambiguity in playtesting, category labels or swatches can be added later as an accessibility and clarity enhancement.
