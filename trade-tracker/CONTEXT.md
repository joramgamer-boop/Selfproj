# Context

Glossary for this project. Terms here are the canonical vocabulary — code, issues,
tests and commit messages should use these words and avoid the listed synonyms.

The project's source document is `trading-risk-framework-notes.md` in this folder.
Where this glossary and those notes disagree on a word, this file wins; where they
disagree on a rule, the notes win.

## The trade lifecycle

### Plan

A sized intention to trade, created before entering: entry price, Stop, Risk, and
the Position size solved from them. A Plan has not touched the exchange. It ends
either by becoming a Position or by being Abandoned.

Not "setup", not "idea", not "order".

### Position

A Plan that is live on the exchange. Exactly one Position may be open at a time.
A Position ends by closing, which produces a Trade.

Not "open trade" — a Trade is by definition closed.

### Trade

A closed, settled Position: the permanent record. **Only Trades count toward
Expectancy.** A Trade has exactly one entry price and one exit price; a scaled
entry or exit is recorded as its weighted average with a scaled-out flag, never
as two Trades.

Not "position", not "order", not "fill".

### Abandoned Plan

A Plan that was sized and then not taken, recorded with a reason (no valid stop /
risk too large to size / price ran away / changed my mind). It stays in the log
permanently but sits outside win-rate and Expectancy math.

Skipping is part of the edge, so a skip is data, not an absence of data.

## Risk

### Stop

The price at which the trade idea is proven wrong, decided from the chart before
entry. The Stop is what makes Risk an enforced fact rather than an intention.

Every Plan has one. A Stop may be *tightened* while a Position is open; widening
it is a Violation.

### Risk

The dollar amount lost if the Stop hits — 2–3% of Balance. Risk is chosen first
and everything else is solved from it.

Never "margin", never a percentage of the Position, never a ROE figure.

### 1R

The unit of Risk for one Plan: `|entry − Stop| × size`, **fixed at the Plan's
original Stop and never recomputed**, even if the Stop later moves. Every result
is denominated in it.

1R is an amount of risk, not a price level. A profit of that size is written
`+1R`, never "the 1R".

### R-multiple

A Trade's realized P&L, net of fees, divided by its 1R. The unit all results are
compared in.

### Target

A price you intend to exit at. Distinct from 1R: a Target is a level on the chart,
1R is a quantity of risk. A Target may be *expressed* in R (`a +2R Target`).

### Notional

The size of the Position in currency — solved as `Risk ÷ Stop distance`, never
typed by hand.

Not "position size" when precision matters, and never confused with Margin.

### Margin

The cash posted to hold a Position: `Notional ÷ leverage`. An **output** of
sizing, displayed but never used as an input, and never treated as Risk.
Isolated margin is assumed throughout; the model does not hold under cross.

### Liquidation Buffer

The required gap between Stop and liquidation price: the Stop must sit no further
than 50% of the distance from entry to liquidation. The liquidation price is
always the figure the exchange reports, never one this project calculates.

### ROE

Return on Margin, as displayed by the exchange. **Deliberately absent from this
project** — never computed, never stored, never rendered. Listed here only so that
its absence reads as a decision rather than an omission.

## Results

### Best Price

The most favourable price reached while a Position was open — highest for a long,
lowest for a short. Required on every Trade, winners and losers alike, because a
loser with a distant Best Price is a round-trip and that is the most expensive
leak there is.

Not "peak" — that word is reserved for Peak Balance below.

### Capture Rate

Of the move that was available, the share actually kept:
`(exit − entry) ÷ (Best Price − entry)`. The single lever that raises returns and
lowers drawdown at the same time.

### Exit Reason

How a Position ended: stop hit / manual exit in profit / manual exit at a loss /
take-profit hit / liquidated. Recorded on every Trade, because prices alone cannot
tell an early exit apart from a round-trip.

### Expectancy

`(win rate × avg win R) − (loss rate × avg loss R)`, over Trades only. The number
that decides whether the account grows.

## The account

### Ledger

The append-only record of everything that moved the Balance: deposits,
withdrawals, and the realized P&L of Trades. The Ledger never refuses to record
something that already happened — a rule may warn, but reality is always written
down.

### Balance

Always *derived* from the Ledger, never stored or typed. Sizing reads it.

### Peak Balance

The highest Balance ever reached. Distinct from Best Price, which is about a
single Position.

### Drawdown

The fall from Peak Balance to current Balance, as a percentage. At 20% the
tripwire fires.

## Discipline

### Rule

One of the constraints the app enforces. Rules that act *before* the fact block a
Plan; rules that act *after* the fact can only warn, because the Ledger must
record what already happened.

### Violation

A permanent flag on a Plan or Trade recording that a Rule was overridden, together
with the typed reason. Violations are data: they make compliance measurable
alongside Expectancy.

### Override

Proceeding past a blocking Rule by typing a reason. Always available — the app's
power is that nothing happens off the record, not that it can stop you.

### Evidence

A screenshot attached to a Trade as proof of the fill. Stored, displayed, and
**never read by the app** — it does not contain the Stop or the Best Price, so it
cannot be a source of logged data.
