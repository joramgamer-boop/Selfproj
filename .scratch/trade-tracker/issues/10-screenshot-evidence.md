# 10 — Screenshot Evidence

**What to build:** When I close a Position I attach a screenshot of the exchange's
closed-position screen. I can open it later from the Trade as proof of the fill.

**Blocked by:** 04 — Position lifecycle.

**Status:** ready-for-agent

**Reference:** ADR-0003 — Evidence is stored and displayed but **never read**. The
screenshot does not contain the Stop or the Best Price, so it cannot be a source
of logged data.

- [x] A screenshot can be attached when closing a Position, and to an existing
      Trade afterwards
- [x] The image is stored as a blob through the storage port and survives reload
- [x] The image is viewable full-size from the Trade detail view and can be
      replaced or removed
- [x] Attaching Evidence is optional — a missing screenshot never blocks closing a
      Position
- [x] **No parsing, OCR, or extraction of any kind** — no field is ever populated
      from the image
- [x] The storage-port contract test covers round-tripping a Trade with an
      attached blob through both implementations
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** A screenshot can be attached as a Position closes or to a Trade
afterwards, opened full size, replaced and removed — and nothing anywhere reads
it.

- **Evidence is its own pair of events** (`EvidenceAttached` / `EvidenceRemoved`),
  not a field on `PositionClosed`. Attaching and replacing are then the same
  command, removal is a row rather than an erasure, and closing with a
  screenshot is simply both events in one batch — so the Trade and its proof
  land together or not at all. The event names the blob; the image itself never
  enters the log, which is read whole on every open.
- **The image travels beside the events, never inside them.** `evaluate` returns
  `attaches` (an image to store) and `discards` (one nothing will point at once
  these events land) alongside the batch. That is what lets the hook get the
  order right: the image goes down *first*, so a Trade never claims proof the
  store cannot produce, and a replaced screenshot is given up only *after* the
  event replacing it is safe.
- **The storage port grew three methods** rather than gaining a second port —
  `putEvidence` / `readEvidence` / `deleteEvidence` — because the ordering above
  is the whole point and it only exists if one thing owns both. The contract
  suite round-trips a closed Trade *with* its blob through a reopened store, in
  both implementations, plus isolation and delete.
- **IndexedDB stores `{ type, bytes }`, not the Blob.** `fake-indexeddb` does not
  survive a Blob — one written and read back comes out as a plain object with
  neither bytes nor type — so keeping Blobs would leave the round-trip that
  matters most untestable until a phone lost a screenshot. The database moved to
  version 2 with each store created only if missing, covered by its own test: an
  upgrade that recreated the stores would open cleanly onto an empty Ledger.
- **Nothing is read.** `isImage` looks at the type the operating system attached
  to the file and at nothing else; no field anywhere is populated from an image,
  and `EvidenceActions` deliberately exposes no seam through which one could be.
  A rendered-app test closes with a screenshot and a *missing* Best Price and
  asserts the close is still refused — the figure the picture could never hold
  is still the trader's to type (ADR-0003).

Decisions worth knowing:

- Evidence hangs off a **Trade**, never a Plan or a live Position: a screenshot
  is proof of a fill, and there has to have been one. The fold refuses to read a
  log that attaches one to a Plan that never closed, exactly as it refuses a
  skip on a live Position.
- `Trade.evidenceId` is resolved once at the end of the fold rather than written
  on at the close. Unlike a Violation it is not a snapshot of a moment — it is
  whatever the last attach or removal left.
- The screenshot is fetched only when a Trade is actually opened. Everything
  else on screen comes from folding the log; a picture nobody asked to see
  should not be part of what every open pays for.

`npm run lint`, `npm run typecheck`, `npm test` (368 tests) and `npm run build`
all pass.

**From code review.** Both axes ran; five findings actioned.

- **A bad file pick could dead-end a close.** The picked screenshot could not be
  un-picked, so a PDF chosen by mistake rode along on every subsequent submit
  and the Position could not be closed at all — the app refusing to record a
  trade that had already happened, which is the one thing it must never do.
  There is now a *Clear the screenshot* button beside the file name, and a test
  that picks a refused file, clears it, and closes.
- The image hook returned `string | null`, where null meant both "still loading"
  and "the store has not got it" — so every Trade with Evidence announced its
  screenshot as missing until the blob resolved. It now answers
  `loading` / `missing` / `shown`, and the detail says nothing while it loads.
- `tradeOf` returned `Trade | string` with the string standing in for a rejection
  reason. Now a tagged union, like `Hold` and every other outcome in that file.
- `putEvidence` and `deleteEvidence` each repeated `append`'s write-transaction
  block verbatim; one `writing` helper now serves all three. And `screenshot()`
  in `src/test/events.ts` returns the `File` a picker hands over, so the
  rendered-app tests no longer keep a near-identical fixture of their own.
- Two rendered-app tests were re-proving verdicts already settled in
  `core/commands.test.ts`, against the spec's "seam 2 is deliberately few". Both
  went; what replaced one of them tests the clear-and-close wiring the core
  cannot see.

Left as-is, deliberately: `isImage` was called scope the ticket never asked for,
and it stays — storing a PDF as Evidence and rendering a broken picture forever
is a worse answer than a sentence saying why, and with the clear button it can
no longer block anything. The fold **throws** on an Evidence event against an
unclosed Plan, matching the five refusals already in `deriveState` for logs that
contradict themselves. `RemoveEvidence` refuses when there is nothing to remove,
exactly as moving a Stop to where it already is refuses. And `Evidence`'s busy
guard is its own rather than `useSubmission`'s, which is shaped around a form
submit this panel does not have.
