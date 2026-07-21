# Gaming Parlor

A zero-dependency, playable browser prototype for the Emoji Wager Sort game. The current visible app build is **v0.3.0**.

The bundled strong prototype catalog now includes 1,176 glyph records, 100 base category selectors, and a 52-selector cross-cutting overlay. The playable mode set now covers nine distinct Standard, Freeform, and Mystery 2/3/4-way sorting games.

## Play

Open `index.html` from a static server, or run:

```bash
npm run dev
```

Then visit <http://127.0.0.1:4173/>.

The GitHub Pages entry point is the root `index.html`, which uses relative asset paths so it works when published at `/Gaming-Parlor/`. A `docs/index.html` redirect is also included in case Pages is configured to publish from `/docs`.

## Test

```bash
npm test
```

The tests use Node's built-in test runner and do not require downloading packages.
