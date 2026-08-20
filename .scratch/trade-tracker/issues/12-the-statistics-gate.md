# 12 — The statistics gate

**What to build:** Until I've logged 30 Trades the app shows me a counter and
nothing else about my performance. Once I pass 30, it finally answers the question
the whole log exists for: is my Expectancy positive after fees, and what is my
real Capture Rate?

**Blocked by:** 09 — The Trade log.

**Status:** ready-for-agent

**Reference:** ADR-0002. A win rate from seven Trades is a random number, and a
random number on screen gets steered by — abandoning a real edge during an
ordinary losing streak, or scaling up after a lucky one.

- [x] A "n / 30 Trades logged" counter is visible, counting closed Trades only
- [x] **No win rate, Expectancy, Capture Rate, fee drag or equity curve is
      rendered below 30 closed Trades**, even though the computations exist
- [x] At 30 or more closed Trades, the app shows: win rate, average win R, average
      loss R, Expectancy per Trade, average Capture Rate, total fee drag as a
      percentage of total Risk taken, max Drawdown, and an equity curve
- [x] Abandoned Plans are excluded from every one of those figures
- [x] Trades with a Violation are identifiable within the statistics, so rule
      breaks can be compared against rule-following Trades
- [x] Statistics are computed in the core and gated at the render boundary, not by
      withholding the computation
- [x] Core tests cover each aggregate against a hand-worked fixture set, and
      confirm the gate opens at exactly 30
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** The counter, and then the answer.

- **`statistics.ts` computes at every count; `StatisticsPanel` decides whether it
  may be looked at** (ADR-0002). `statisticsOf(state)` returns every figure
  whatever the log holds, with `readable` beside them — true at 30 closed Trades.
  Withholding the arithmetic instead would leave the app unable to say how far off
  the answer is, which is the one honest thing there is to show before then.
- **Breakevens are neither.** A win is above 0R, a loss below it, and a Stop
  trailed to entry and hit there is in the denominator of both rates and in
  neither average — the 0R that ADR-0001 keeps the denominator fixed to report
  must not be filed under wins.
- **The average loss carries its sign.** The glossary writes Expectancy as
  `(win rate × avg win R) − (loss rate × avg loss R)` with the loss as a
  magnitude; the code adds a negative number instead, which is the same
  arithmetic and renders as the `-1.00R` it is. The glossary now says so.
- **Fee drag is against the Risk taken**, not the Notional or the P&L: 1R is the
  unit everything else here is in, and a drag quoted against a Notional many times
  the Risk would read as a fraction of what it costs. The fixture that proves it
  is the ticket in miniature — a −1R stop-out and a +1R winner, flat on the
  prices, at −0.1R per Trade once $4 of fees on $40 of Risk are in.
- **Max Drawdown is the Tripwire's Drawdown**, folded over the same Ledger with
  the same `drawdownOf`. A second definition would put a figure on this panel
  arguing with the banner above it. A Withdrawal deepens it, and that is honest.
- **The equity curve is the Ledger, not the Trades.** Deposits are in it as steps
  up: a curve that hid them would show a Drawdown recovering that never did. Drawn
  unscaled and unlabelled, because every figure worth a number is in the list
  above it.
- **Violations are a cohort, not a flag.** `withViolations` and
  `withoutViolations` carry the same aggregates, rendered as a two-row table. This
  is what makes overriding affordable: every block can be gone through by typing a
  reason, and the price is a log where the breaks are countable beside the Trades
  that kept to the Rules.
- **Abandoned Plans and live Positions reach none of it** — a seam-1 test asserts
  the whole `Statistics` object is unchanged by adding both to the log.
- **A superseded seam-2 test was narrowed.** Ticket 09 left "reports no
  performance statistics, whatever the log holds", which forbade the words "trades
  logged" anywhere on screen. The counter this ticket asks for is exactly that, so
  the test now asserts what still holds: the Trade log totals nothing itself.
- **The glossary gained Win rate, Fee drag and Equity curve**, and a Max Drawdown
  note under Drawdown. All three were vocabulary the spec used and `CONTEXT.md`
  had not settled.

The fixtures moved into `src/test/events.ts` (`closedTrades`, `breakeven`, `day`)
because both seams need to build thirty Trades. With no fees an R-multiple is the
move over the 4-point Stop distance whatever the Balance was, which is what makes
the hand-worked table in `statistics.test.ts` readable at all.

`npm run lint`, `npm run typecheck`, `npm test` (460 tests) and `npm run build` pass.

**From code review.** Both axes ran. The Spec axis recomputed every fixture from
`solveSizing`/`solveSettlement` rather than from the comments and found the
arithmetic correct; the findings actioned:

- **Arithmetic had leaked into a component.** `StatisticsPanel` was scaling the
  equity curve itself — `Math.min`/`Math.max` over the balances and the x/y
  projection — against the spec's "no arithmetic, no Rule evaluation, no Balance
  derivation in a component", and it was the only `Math.` in the whole components
  folder. The curve is now an `EquityCurve` solved in the core: the ends it runs
  between and the points in a box the SVG scales. An upside-down line still
  renders, so it is exactly the kind of thing that had to be testable at seam 1,
  and three tests now watch it.
- **A cohort nothing fell into printed a measurement.** With no Violations
  anywhere — the common case — the "Broke a Rule" row read `0`, `0%`, `+0.00R`,
  while `averageWin`/`averageLoss` guarded that exact case with an em dash. The
  same objection, handled two ways. Every average, rate and share on `Aggregates`
  is now `number | null`; counts stay numbers. `formatAverageR` and
  `formatPercent` print the dash, next to `formatCaptureRate` which already did,
  and the panel has no conditionals left in it at all.
- **`EquityPoint` carried `at` and `kind` that nothing read.** Gone with the
  rewrite above.
- **The app-wide "no statistics" assertion had been narrowed too far.** Ticket
  09's test forbade those words anywhere on screen; scoping it to the log region
  left nothing asserting they appear nowhere. The 29-Trade test now sweeps the
  whole document for every gated figure by label, not just the panel.
- **Seam 2 was restating seam 1's arithmetic.** The 30-Trade test asserted eight
  exact figures already proven in `statistics.test.ts`. It now asserts what only
  the render boundary can: the gate opened, every figure the ticket lists is on
  screen, and the right figure reached the right label. The compliance test checks
  the two cohorts' counts rather than re-deriving their Expectancy.

Left as-is, deliberately:

- **The counter drops the "/ 30" once the gate is open.** The criterion spells the
  counter as "n / 30 Trades logged", and past 30 that reads "47 / 30" — a
  fraction of a threshold that has already gone. It becomes "47 Trades logged"
  under the same label, and the count stays on screen for good either way.
- **`formatPercent` is named for what it prints**, like `formatMoney` and
  `formatWhen`. It deliberately does not go through `drawdownPercent`: that
  rounding has exactly one definition because a Rule reads it, and a win rate is
  only ever read.
- **Average Capture Rate is a mean over the Trades that had a move available**,
  which can be fewer than the win rate's denominator. That is the glossary's
  definition and the same exclusion each row of the log makes; a second
  denominator on screen would explain less than it cost.
- **The paragraph explaining the gate.** ADR-0002 predicts a reader will assume
  the feature is unfinished. The trader deserves the same sentence.
