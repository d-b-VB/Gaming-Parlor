# Content Generation

## Data philosophy

Items are not arranged into a tidy taxonomy.  Each item has many descriptive tags.  Tags are cross-cutting and non-exclusive.

A penguin can be `animal`, `bird`, `vertebrate`, `polar`, `cold`, `land`, `sea`, `black`, and `white`.

A flag can be `flag`, `island`, `Europe`, `subpolar`, `cross`, and have colors `blue`, `red`, and `white`.

Country-flag categories must be objective.  Do not use subjective geography categories such as `mountainous`, and avoid broad categories such as `coastal` that apply to most countries.  For flags, `equatorial` should mean the country touches the equator, and `polar` should mean the country or territory touches or lies within a polar circle.

Category tags should be literal rather than associative.  For example, `celebration` means party, holiday, award, or decorative celebration objects such as presents, balloons, confetti, holiday decorations, medals, and trophies.  It should not include crafting supplies, generic art objects, or games merely because they might appear at a party.  Likewise, `insect` should not include worms, snails, spiders, or scorpions; `flying` should not include flightless birds; and `hand` should not include generic body parts such as bones, legs, or anatomical hearts.

## Items

Each item in `data/items.json` has:

- `id`: stable string identifier.
- `glyph`: displayed symbol.
- `name`: human-readable name.
- `kind`: `emoji`, `flag`, or `symbol`.
- `tags`: flat descriptive tags.
- `colors`: atomic colors where relevant.

The content catalog should be large enough to avoid repetitive boards.  The strong prototype target is at least 3x the starter catalog size and at least 2x the starter category count.  The current expanded catalog exceeds this with broad coverage across faces, people, animals, food, buildings, vehicles, household/office objects, sports, clothing, signs, flags, and symbols.

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

1. Load curated selectors from `data/category_selectors.json`, then append `data/cross_cutting_categories.json` and `data/category_expansion_overlays.json`. The expansion overlay is the preferred home for broad category passes because it keeps new explicit category membership in one reviewable file instead of editing many individual item records.
2. Filter to selectors with at least 4 eligible items.
3. Read the active mode config to determine direction count, group count, and prompt count.
4. Pick the required number of selectors for the board: 4 for 2-way, 6 for 3-way, or 8 for 4-way.
5. Prefer known opposite pairs across opposite directions when possible.
6. For each selector, choose 4 unique items.
7. No glyph may appear twice on the same board.
8. Enforce strict category isolation: for every active category, no glyph assigned to any other active category may also match it.
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
