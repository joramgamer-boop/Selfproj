# 05 — Rule engine and overrides

**What to build:** When a Plan breaks one of my rules, the app stops me and tells
me which rule. I can always proceed anyway by typing why — and that reason is
permanently attached to the trade as a Violation.

**Blocked by:** 04 — Position lifecycle.

**Status:** ready-for-agent

**Why overridable:** the app has no power over the exchange. A rule that can never
be broken gets bypassed by simply not opening the app, and an unlogged trade is
worse than a logged Violation because it also corrupts the Ledger.

- [x] Rules are modelled as data — an id, a verdict function over derived state
      and the proposed command, and a pre-fact/post-fact classification
- [x] Command evaluation returns either the events to append or the blocking Rule
      verdicts; **components never decide verdicts**
- [x] Rule: a Plan with no Stop is blocked
- [x] Rule: a Plan whose Stop sits further than 50% of the distance from entry to
      the liquidation price is blocked
- [x] Rule: opening a Position while another is open is blocked
- [x] Any block can be overridden by typing a reason; the reason is required and
      cannot be empty — with one documented exception, the no-Stop block (see
      the comments below)
- [x] An override records a Violation permanently on the resulting Plan or Trade,
      naming the Rule and carrying the reason
- [x] Core tests cover each Rule at its boundary, the override path, and that a
      Violation survives the fold onto the closed Trade
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** `core/rules.ts` is the whole engine: a `RULES` array where each
entry is an id, a name, a `pre-fact`/`post-fact` classification and a verdict
function over `(state, command)` returning the explanation or null. `judge`
runs them all and returns `RuleVerdict[]`. Nothing else in the app knows what a
Rule is — components render verdicts and dispatch commands.

- `Evaluation` gained a third arm, `blocked`, alongside `append` and
  `rejected`. The distinction is the point of the ticket: a **block** is the
  app's entire authority and can be answered with an Override, a **rejection**
  is a command that could not be carried out at all, and no reason typed into
  it would produce anything to record.
- `CreatePlan` and `OpenPosition` carry an optional `override: { reason }`.
  One Override answers every Rule the command broke, and each Rule gets its own
  `Violation` so compliance stays countable per Rule.
- Violations are written onto `PlanCreated` and `PositionOpened` and folded onto
  `Plan.violations`, which **accumulates** across the Plan's life rather than
  being fixed at creation. That is what carries an open-time Violation onto the
  closed Trade via `trade.plan`, and it is the seam ticket 07's `StopMoved` will
  append to.

**A Violation lives on the Plan, and a Trade reads it through the Plan it was.**
`Trade` does not duplicate the list. The Plan snapshot a Trade holds is taken at
the close, so it already carries everything overridden along the way, and one
list cannot drift from the other.

**The Rules are not re-judged when the log is folded.** `deriveState` records
what the events say and never asks whether these Rules would still block this
Plan today. Re-adjudicating would let a later change of policy make an already
written row unreadable — the same reason `solveSizing` and `solveSettlement`
are arithmetic-only.

**Deliberate departure: the no-Stop block is the one an Override cannot get
past.** Every other block goes through with a reason. This one is blocked by
the Rule, and if the trader overrides it the sizing then rejects it, because
`Notional = Risk ÷ Stop distance` has no answer without a Stop and 1R — the
denominator of every figure the log exists to produce (ADR-0001) — would be a
fiction. Story 11 is the only story in spec.md that says "**unable** to" rather
than "blocked", which reads as the same judgement. The Rule's own explanation
says so up front rather than letting the trader discover it after typing.
The designed route for this case is ticket 06's Abandoned Plan reason "no valid
stop", which keeps the skip in the log as data. Challenge this if the ticket
meant the override to size a Plan against a Stop of zero.

**The Open button stays on offer while a Position is live.** Ticket 04 hid it;
hiding a block is the one thing this app must not do, because the trade then
happens off the record. Reopening a Plan that is *already* live is still a flat
rejection — that is a tap that means nothing, not a Rule to argue with.

**One button, two states.** `useSubmission` owns the whole Override
interaction, so no component decides anything: submit sends the command, a
block comes back and renders, and the same button — now reading "Create Plan
anyway" — sends again with the typed reason. The reason is passed through
untouched; whether it is empty is the core's call and is tested there.

`npm run lint`, `npm run typecheck`, `npm test` (180 tests) and `npm run build`
all pass.
