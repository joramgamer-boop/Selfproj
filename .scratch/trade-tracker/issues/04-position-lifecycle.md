# 04 — Position lifecycle

**What to build:** I take a Plan live as a Position, and later close it into a
Trade by entering what actually happened. My Balance moves by the realized P&L,
and my next Plan sizes off the new Balance automatically.

**Blocked by:** 03 — Plan sizer.

**Status:** ready-for-agent

**Reference:** ADR-0001. Note the Trade is one record even when the exit was
scaled — see `trade-tracker/CONTEXT.md`.

- [x] A Plan can be opened as a Position; the app shows the open Position
      prominently
- [x] Closing a Position requires exit price, fees, Best Price and an Exit Reason,
      and produces a Trade
- [x] Exit Reason is a fixed list: stop hit / manual exit in profit / manual exit
      at a loss / take-profit hit / liquidated
- [x] Best Price is required on **every** Trade, winners and losers alike
- [x] Fees are recorded as their own field, separate from P&L
- [x] Realized P&L is net of fees and appends to the Ledger; Balance moves
      accordingly
- [x] A scaled entry or exit is recorded as a weighted average on the single
      Trade, with a scaled-out flag — never as two Trades
- [x] Timestamps for open and close are auto-stamped from the injected clock and
      remain editable; an edited timestamp is marked as edited
- [x] Free-text notes can be attached to a Trade
- [x] Core tests cover the full Plan → Position → Trade fold, the Ledger effect of
      a winner and a loser, and that 1R still reflects the original Stop
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** The lifecycle folds as one arithmetic: `PositionOpened` carries
nothing but the Plan id, and `PositionClosed` carries what the trader typed.
Everything else — P&L, the Balance it moved, whether a timestamp was edited — is
solved from the log against the Plan that was sized.

- `core/trade.ts` holds the fixed list of Exit Reasons and `ClosingRecord`, the
  eight figures a close records. The type is derived from the list, so the five
  reasons exist in exactly one place.
- `core/settlement.ts` splits the way `sizing.ts` did. `solveSettlement` is the
  arithmetic and always answers — a Trade that has happened has a P&L whatever
  the record around it looks like — and the **fold uses that one**. `closeOut` is
  the gate a close passes before it is written down.
- `useSubmission` is the form shape ticket 03 deferred to this ticket: the
  saving guard, the rejection the core returned, and the reset on success. All
  five forms now share it, along with `components/Field` and `PlanFigures` —
  the Plan headline reads the same on a Plan row and on the live Position
  because it is the same component.

**Opening is one tap; the record is corrected at the close.** Story 20 asks to
take a Plan live "with one action", and story 26 asks for editable timestamps.
Both hold here: the button on a Plan row writes `PositionOpened` with nothing to
fill in, and the close form carries *both* ends of the hold behind a "Correct
the record" disclosure, defaulted to the stamps. That is also where the averaged
entry and the scaled flags live, because an average entry is only known once the
last fill is in. The consequence: a Position that is never closed cannot have
its open time corrected. That seemed the right trade for a screen used in the
seconds after a fill.

**An edit is a difference from the stamp, not a flag anyone sets.**
`PositionClosed` stores what the clock said (`at`) and what the trader says
happened (`openedAt`, `closedAt`); the fold marks the difference. So an edited
timestamp cannot be claimed or forgotten separately from the correction itself.
The mark is data this ticket does not render — ticket 09's detail view shows
"every logged and derived field", which is where it belongs.

**A scaled entry is flagged too.** The ticket names only a scaled-out flag, but
the entry price on a Trade may be a weighted average, and without a flag an
average is indistinguishable from a fill — which is exactly the question
"did scaling help?" that the flag exists to answer. `CONTEXT.md`'s Trade entry
was amended to name both. Challenge it if the asymmetry was deliberate.

**Best Price is checked for the side it can be on.** A Best Price below the
entry on a long is not a bad trade, it is an impossible one: the price stood at
the entry the moment the Position opened. Storing one would make Capture Rate
report nonsense. This is the same class of check as ticket 03's refusal of a
Stop on the wrong side of entry, not a Rule in the ticket-05 sense.

**Fees blank is refused, not read as zero.** The exchange always charged
something, and a silent zero would flatter exactly the figure — fee drag — that
half the point of the log is to measure.

**Size comes from the Plan, the move from the fill.** `solveSettlement` uses
`plan.notional / plan.entryPrice` for the size and the *recorded* entry for the
move, so a fill away from the planned entry costs captured move rather than
quietly resizing the risk that was committed. That matches how the order is
actually placed: the Plan says how many units to buy, and the exchange fills
them where it fills them.

**A Trade booked late reads out of order in the Ledger.** The row is stamped
when the money moved, but the running Balance follows the order of the log,
because that is the order it was folded in. The alternative is a running Balance
that never happened.

**Deliberately not done here:** nothing refuses a second Position while one is
open. That is a Rule, and a Rule in this app blocks *and can be overridden with
a typed reason* — ticket 05. Shipping the block without the override would do
the one thing the app must never do, which is push a trade off the record. The
fold already tolerates two open Positions, with a test pinning it. R-multiple,
Capture Rate and the Trade list are ticket 09; the app shows a closed Trade only
as its Ledger row for now.

**Known limitation:** "shows the open Position prominently" is a CSS fact — an
accent-bordered panel directly under the Balance, above the sizer. jsdom does no
layout, so the tests assert the panel and its figures, not its prominence.

**From code review.** Standards and Spec axes ran in parallel.

- The hard block on a second Position was the most serious finding on both axes,
  and it is gone (above).
- Seam 2 had grown thirteen journeys, against spec.md's "if a behaviour can be
  tested at seam 1, it belongs at seam 1". Five that restated core tests were
  removed and their wiring assertions folded into the winner journey.
- The Plan headline was rendered twice, in `PlanList` and `PositionPanel` —
  now `PlanFigures`. The five Exit Reasons were written twice; the union is now
  derived from the list. `Stamp` duplicated `Field` for a different input type.
- `Trade extends Position` made a Trade assignable wherever a Position was
  expected, against CONTEXT.md's "a Trade is by definition closed". Composed
  instead.
- Kept, with reasons above: the Best Price side check, the size-from-the-Plan
  P&L, the Ledger row stamped at the close, and `scaledIn`.

`npm run lint`, `npm run typecheck`, `npm test` (157 tests) and `npm run build`
all pass.
