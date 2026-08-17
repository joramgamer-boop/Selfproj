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

- [ ] CSV export produces one row per closed Trade with the logged fields, fees,
      Violations and derived 1R, R-multiple and Capture Rate — flat and
      spreadsheet-readable
- [ ] JSON export produces a complete event-log backup including Evidence blobs
- [ ] JSON import restores a backup to a working state — this must be verified, not
      assumed
- [ ] Exporting is recorded as an event so trades-since-last-export is derivable
- [ ] The count of Trades since the last export is always visible
- [ ] Rule: creating a new Plan is blocked after 10 unexported Trades, overridable
      like any other block
- [ ] Core tests cover the unexported-Trade count and the block firing and clearing
- [ ] A test round-trips a populated log through export and import and asserts the
      restored derived state matches the original
- [ ] `npm run lint` and `npm test` pass
