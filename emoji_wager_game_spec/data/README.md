# Data Files

## `items.json`

Flat glyph catalog.  Use tags as descriptors, not a hierarchy.

The strong prototype catalog contains over 1,100 glyph records, including faces, people, animals, food, buildings, vehicles, objects, sports, clothing, signs, flags, and symbols.

Important fields:

- `id`: stable identifier.
- `glyph`: displayed character or emoji.
- `name`: human-readable name.
- `kind`: `emoji`, `flag`, or `symbol`.
- `tags`: flat descriptive tags.
- `colors`: atomic colors when relevant.

## `category_selectors.json`

Curated group selectors.  Selectors may use tags, colors, kind, exclusions, exact color sets, or color counts.

The same selectors should feed 2-way, 3-way, and 4-way sort board generation.

The strong prototype selector set contains 99 curated categories.  Categories should remain objective enough that players lose because of memory and speed, not because the category itself is arguable.

## `default_state.json`

Starter resource, unlock, upgrade, and memory state for local-only prototypes.  2-way sort starts unlocked; 3-way and 4-way sort start locked and must be purchased with Diamonds.
