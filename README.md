# Gaming Parlor

A zero-dependency, playable browser prototype for the Emoji Wager Sort game. The current visible app build is **v0.2.4**.

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
