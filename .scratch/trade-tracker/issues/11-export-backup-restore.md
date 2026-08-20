# 11 — Export, backup and restore

**What to build:** I can pull a CSV of my closed Trades to open in a spreadsheet or
hand to the future analyzer, and take a full backup I can actually restore from if
I lose my phone. The app nags me — and eventually blocks me — if I haven't backed
up in a while.

**Blocked by:** 09 — The Trade log; 10 — Screenshot Evidence.

**Status:** ready-for-agent

**Why the block:** browser storage is deletable. A log that vanishes at Trade 40
destroys the entire point of the exercise, so backing up is enforced the same way
every other rule is.

- [x] CSV export produces one row per closed Trade with the logged fields, fees,
      Violations and derived 1R, R-multiple and Capture Rate — flat and
      spreadsheet-readable
- [x] JSON export produces a complete event-log backup including Evidence blobs
- [x] JSON import restores a backup to a working state — this must be verified, not
      assumed
- [x] Exporting is recorded as an event so trades-since-last-export is derivable
- [x] The count of Trades since the last export is always visible
- [x] Rule: creating a new Plan is blocked after 10 unexported Trades, overridable
      like any other block
- [x] Core tests cover the unexported-Trade count and the block firing and clearing
- [x] A test round-trips a populated log through export and import and asserts the
      restored derived state matches the original
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** Two files come out of the app, one of them goes back in, and the
log says which of the two happened.

- **A Backup is the log; a CSV is a reading of it** (ADR-0004). `backup.ts` writes
  the whole event log as JSON with the Evidence base64 inside it; `csv.ts` writes
  one flat row per closed Trade — the logged fields, fees, the Violations by id
  and the derived 1R, R-multiple and Capture Rate, oldest first so a spreadsheet
  plots an equity curve down the rows. Both are recorded as an `Exported` event,
  and **only the Backup clears the count**: a CSV holds no events, no skipped
  Plans and no screenshots, so a Rule that exists because storage is deletable
  must not be answerable by a file that cannot put the log back.
- **Restoring is an append, not a replacement.** `RestoreBackup` is a command like
  any other: it appends the log the file carried, then a `Restored` event behind
  it. It refuses onto a device that already holds a log — the log is append-only,
  and interleaving two histories leaves neither readable — and it **folds the
  events before storing them**, because a log that cannot be folded throws on
  every open with nothing to undo it.
- **The count is folded, never stored.** `tradesSinceBackup` counts closes and is
  put back to zero by a Backup or a restore; `backupDue` is folded beside it, so
  the Rule that blocks a Plan and the panel that nags read the same answer and
  cannot come to disagree.
- **The nag sits above the Trade log**, not below it. The log grows without limit,
  and a count of unbacked Trades underneath it is one nobody scrolls to.
- **`Downloads` is a port**, like `DurableStorage`: what a browser does with a
  file cannot be asserted on, so the tests watch what was handed over. The
  `Exported` event is written on the far side of it — recording the export first
  would clear the Rule with a file that failed to save.
- **`ScreenshotPicker` became `FilePicker`** with an `accept` prop. Restoring
  needs the same "a file input cannot be controlled by its value" trick that
  attaching a screenshot does.

Departures from the spec, deliberately:

- **`Restored` is not in the spec's list of events.** It is here because a restore
  is the largest thing that can happen to a log and one that left no trace would
  make the history read as though these Trades had always been on this phone —
  and because it answers the Backup Rule honestly, the file it came from being a
  Backup of exactly this log.
- **The ticket says "trades since the last export"; the code counts Trades since
  the last *Backup*.** Argued in ADR-0004 and in the glossary, which this change
  also adds. Story 47's "10 unexported Trades" is met — it is only a CSV that no
  longer counts as having exported anything.

`npm run lint`, `npm run typecheck`, `npm test` (433 tests) and `npm run build`
all pass.

**From code review.** Both axes ran; the findings actioned:

- **A refused restore could destroy a screenshot.** The Backup's images were
  written to the store *before* the core adjudicated the restore, so every
  refusal — device already in use, empty backup, unfoldable log — left them
  written, under ids the incoming file chose. On a populated device that
  overwrites the proof a real Trade was standing on. `whyNotRestorable` is now
  exported from the core and asked *before* a single image goes down; the command
  asks again before the events do. `backups.test.ts` holds the test.
- **A Rule threshold had leaked into a component.** `BackupPanel` computed
  `tradesSinceBackup >= UNBACKED_TRADE_LIMIT` itself, against the spec's "no Rule
  evaluation in a component". It now renders the folded `backupDue`, exactly as
  `DrawdownTripwire` renders `drawdownReviewDue`.
- **Two refusals were being decided in the app layer** — nothing to export, and
  nothing to back up. They are the core's now (`nothingToExport`), where every
  other refusal is decided and where they can be tested at seam 1.
- A seam-2 test that a CSV leaves the count alone went: it was re-proving what
  `state.test.ts` and `rules.test.ts` already settle, and the spec asks for seam 2
  to be deliberately few. The `exported()` helper now takes `ExportFile` and
  `ExportFormat` rather than restating both inline, and the one unchecked cast in
  `readBackup` carries a comment naming what validates it instead.

Left as-is, deliberately: the extra CSV columns (Notional, Margin, Stop moves,
the edited-timestamp flags) — they are logged fields, they cost nothing, and the
analyzer this file exists to feed will want them. And the version refusal in
`readBackup`: half a log restored is worse than none, and the trader still has
the file.
