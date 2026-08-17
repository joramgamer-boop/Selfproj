# 01 — Scaffold and record a Deposit

**What to build:** I can open the app, record a deposit, and see my Balance. I
close the app, reopen it, and the Balance is still there.

This is the tracer bullet: the thinnest complete path through every layer the
other eleven tickets build on. It establishes the event-sourced core, the storage
port with both implementations, and one screen — but only the `Deposit` event
exists so far.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Reference:** `.scratch/trade-tracker/spec.md`, `trade-tracker/CONTEXT.md`.

- [x] `trade-tracker/` project created with React + Vite + Vitest + TypeScript,
      its own `package.json`, lint and test scripts, per the repo's
      project-per-folder convention
- [x] The domain core folds an append-only event log into derived state; Balance
      is derived from the Ledger and never stored
- [x] `Deposit` is recordable and appears in the Ledger with an auto-stamped
      timestamp from an injected clock
- [x] A storage port exposes reading and appending events, with an in-memory
      implementation and an IndexedDB implementation behind it
- [x] A single contract test suite runs against both storage implementations and
      passes for each
- [x] One screen shows current Balance and the Ledger entries; Balance survives a
      full reload
- [x] Core tests cover Balance derivation, including the empty-log case
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** The tracer bullet is in place across all three seams.

- Core (`src/core/`): `events.ts` holds the log's event union — only `Deposit`
  so far; `state.ts` folds it into `{ balance, ledger }`; `commands.ts` exposes
  `evaluate(state, command, clock)` returning either events to append or a
  rejection, so evaluation stays separate from application. Rule verdicts join
  that union in ticket 05.
- Storage (`src/storage/`): `eventStore.ts` is the port (`read` / `append`), with
  in-memory and IndexedDB implementations. `eventStoreContract.ts` holds one
  suite run against both from `eventStore.contract.test.ts` (7 cases × 2), via
  `fake-indexeddb` for the real adapter. The contract includes reopening a store
  over the same data, so the in-memory fake cannot drift from production.
- UI: `useTradeTracker.ts` is the only place storage, clock and core meet;
  components render derived state and dispatch commands. `App` takes `store` and
  `clock` as props, so the app tests run over the in-memory store.

Decisions worth knowing:

- Ledger entries key off their position in the log (`seq`) rather than a
  generated id — nothing in this ticket needs to reference an event. Plans will
  need real ids; that is when an id port earns its place.
- Money is a plain number, with folded sums rounded to cents at the derived
  boundary (`core/money.ts`), so a long Ledger cannot drift into
  `749.9999999999999` and then into a Position size solved from it.
- A Deposit of zero, negative, `NaN` or infinity is *rejected* rather than
  blocked-with-override — a malformed input is not a Rule verdict, and nothing
  real happened to record.

`npm run lint`, `npm run typecheck`, `npm test` (36 tests) and `npm run build`
all pass.

**From code review.** Four findings actioned:

- The hook held both the log and the derived state, so a command that started
  while another was still saving folded a stale copy — two quick taps stored two
  Deposits but showed one. The log now lives in a ref that is read at the moment
  of use, derived state comes from `useMemo`, and `Record Deposit` is disabled
  while a command is in flight. Covered by a test over a store whose `append` is
  held open.
- A Deposit is recorded to the cent, so Ledger entries always add up to the
  Balance folded from them.
- The fold switches on event type and throws on an unhandled one, so the next
  event type has to state how it moves the Balance instead of silently leaving
  it unchanged.
- The `deposit(...)` test factory is shared from `src/test/events.ts` rather than
  written once per seam.

Left as-is, deliberately: `evaluate` returns a `rejected` outcome distinct from
the Rule verdicts ticket 05 will add (a malformed amount is not an overridable
Rule break); the port has no Evidence methods yet (ticket 10); and `format.ts`
renders dollars, matching the source notes.
