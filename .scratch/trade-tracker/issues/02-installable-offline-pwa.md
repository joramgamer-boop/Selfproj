# 02 — Installable offline PWA

**What to build:** I can add the app to my phone's home screen and open it with no
network connection, and my log isn't silently deleted by the browser after a few
weeks of not trading.

**Blocked by:** 01 — Scaffold and record a Deposit.

**Status:** ready-for-agent

**Why it matters:** iOS evicts storage from ordinary Safari tabs after roughly a
week of non-use. For a sequential trader with gaps between trades, that is a
realistic way to lose the entire log. An installed PWA gets durable storage that
isn't evicted on that timer.

- [x] Web app manifest with icons, name and standalone display mode; the app is
      installable to the home screen on mobile
- [x] A service worker caches the app shell so it launches and functions fully
      with no network
- [x] Persistent storage is requested, and whether it was granted is visible
      somewhere in the app
- [x] Layout is phone-first: readable and usable one-handed, with desktop simply
      getting the same views wider
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** The app installs, launches with no network, and says out loud
whether the browser has promised to keep the log.

- **Durability is a port, like storage is** (`src/storage/durability.ts`).
  `DurableStorage.request()` answers `durable` / `evictable` / `unknown`,
  wrapping `navigator.storage.persist()`. Three answers rather than a boolean
  because a browser that *refuses* to answer (private browsing throws) is not the
  same as one that answered no, and the two want different words on screen. `App`
  takes it as a prop beside `store` and `clock`, so the UI tests drive every
  branch without touching a real browser.
- **The notice sits at the foot of the account screen**, green when durable and
  red otherwise, and says what to do about it (add to the home screen). Nothing
  renders until the browser has answered — claiming "at risk" for a frame and
  then correcting it would be worse than saying nothing.
- **Manifest and service worker via `vite-plugin-pwa`** (`generateSW`), rather
  than hand-rolling. The precache manifest has to list *hashed* build assets, and
  a hand-rolled cache that misses one fails only offline, which is exactly when
  nobody can debug it. The precache covers all ten shell URLs — `index.html`, the
  hashed JS and CSS, `manifest.webmanifest`, `registerSW.js` and every icon —
  with `navigateFallback: 'index.html'`.
- **Icons are generated, not fetched** (`scripts/generate-icons.mjs`, `npm run
  icons`): three ascending bars in the app's own palette, drawn to PNG with a
  small encoder over `node:zlib`. The PNGs are committed, so a build never runs
  the script. The maskable variant keeps its glyph inside the 80% safe zone.
- **Phone-first pass**: safe-area insets on the app padding (an installed app has
  no browser chrome to hold content off the notch), `100dvh` rather than `vh`,
  3rem minimum tap targets, `touch-action: manipulation` on Record Deposit, and
  one breakpoint at 48rem that only makes the same column wider.

Decisions worth knowing:

- Persistence is requested once, on open. `spec.md` says "requested at install",
  but there is no install event to hang it on and the answer only changes when
  the app *is* installed — which reopens it. So: every open, no "ask again"
  button.
- `registerType: 'autoUpdate'` — a solo-user app with no server has nothing to
  coordinate, so a new build should simply take over on the next launch.
- iOS gets its own `apple-mobile-web-app-*` metas in `index.html` alongside the
  manifest, because Safari reads those rather than `display: standalone`.
- The manifest carries an explicit `id`. It is the one field that is expensive to
  add later: without it identity is derived from `start_url`, so moving
  `start_url` would orphan an installed copy with the Ledger inside it.

`npm run lint`, `npm run typecheck`, `npm test` (45 tests) and `npm run build`
all pass. The built shell was smoke-tested over `vite preview` — `index.html`,
`sw.js`, `manifest.webmanifest` and every icon serve 200 — and the generated
`sw.js` precache list was read directly to confirm it covers the hashed assets
`index.html` references. **A real offline load was not exercised**: that needs a
browser driving a registered service worker, which this project has no harness
for. Worth doing by hand on a phone before trusting it.

**From code review.** Actioned:

- The hook let a rejected request leave the notice permanently *absent* — the
  silent version of the exact failure this ticket exists to prevent. It now
  falls back to `unknown`, covered by a test over a store that rejects.
- `orientation: 'portrait'` was dropped from the manifest. Nothing asked for it,
  and it takes away the ability to turn an installed phone app sideways.
- The port was named `Persistence` and lived in `storage/`, where "persistence"
  already means the event store — three files ended up sharing the word. Renamed
  to `DurableStorage` / `Durability` in `storage/durability.ts`.
- The palette lived in five places, under a comment claiming the icons could not
  drift from the app. Now `palette.js` holds `ground` / `edge` / `accent` for the
  manifest and the icon script; `index.css` and the `theme-color` meta cannot
  import it and say so in a comment.
- One rendered-app test asserting the `unknown` copy was dropped as a duplicate
  of the rejection test, which asserts the same words.

Left as-is, deliberately: `storage/durability.test.ts` is a fourth test seam the
spec's list of three doesn't name — it earns its place for the same reason seam 3
does, that this is the layer where silent data loss lives. And `store` + `clock` +
`durableStorage` stay three separate props rather than one environment object;
they are three unrelated ports, and bundling them would hide which one a change
actually touches.
