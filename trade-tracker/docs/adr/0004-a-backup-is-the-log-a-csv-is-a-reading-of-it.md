# A Backup is the log; a CSV is a reading of it

The app exports two files, and only one of them answers the Rule that blocks new
Plans after 10 unbacked Trades.

- **Backup** — the whole event log as JSON, with the Evidence blobs base64 inside
  it. It restores, and taking one puts the count of Trades since the last Backup
  back to zero.
- **CSV** — one flat row per closed Trade, with the logged fields and the derived
  1R, R-multiple and Capture Rate. It is recorded in the log as an `Exported`
  event, and it does **not** clear the count.

## Why

The Rule exists because browser storage is deletable: a log that vanishes at
Trade 40 destroys the whole exercise. A Rule with that justification can only be
answered by a file that can put the log back.

A CSV cannot. It holds no events, so nothing can be folded from it; no Abandoned
Plans, because a skip has no result to tabulate; no Evidence; and no Ledger
beyond what the Trades themselves moved. Letting a CSV clear the count would let
the trader satisfy the Rule with a file that, on the day the phone is lost, turns
out to be a spreadsheet of trades on an account that no longer exists.

The two are still both `Exported` events rather than one event and one silence,
because taking a CSV is real history — it says the trader went to read their log,
which is exactly the behaviour the whole app is trying to produce.

## Restoring

A Backup is restored **only onto a device with nothing recorded on it**: no Plan
and no Ledger row. The log is append-only, so a restore is an append, and
appending one history onto another leaves neither readable — the Plan ids
collide and the fold reports figures belonging to both. There is no "replace the
log" operation, deliberately: the app has no way to record a deletion, and a
restore that quietly destroyed a log would be the one irreversible thing in an
otherwise append-only design.

Restoring appends a `Restored` event behind the log it carried. The restore is
history like everything else, and it honestly answers the Backup Rule: the file
it was just read out of is a Backup of this log.

## Consequences

- A trader who wants to restore onto a phone already holding a log must clear the
  app's storage first. The refusal says so.
- The events a restore writes are checked by folding them **before** they are
  stored. A log that cannot be folded throws on every open with nothing to undo
  it, so it is refused while the trader still has the file.
- Whether a restore is possible is therefore asked twice: once by the app layer
  before it writes the Backup's screenshots, and again by the command before the
  events go in. Only the first ordering is safe — a restore refused after the
  screenshots were written would have written them over the proof a Trade on
  this device was standing on, under ids the incoming file chose.
- A Backup grows with the screenshots. That is the cost of one file rather than a
  file and a folder of images, one of which gets lost.
