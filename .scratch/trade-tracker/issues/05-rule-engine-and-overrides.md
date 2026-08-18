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
      cannot be empty
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

**The no-Stop Rule refuses rather than blocks, and says so in its own data.**
Every block is overridable — story 17's "override **any** block" holds without
exception, because a missing Stop no longer produces a block. `Rule` carries an
`overridable` flag alongside the pre-fact/post-fact classification, and
`stop-required` is the only Rule with it false: `Notional = Risk ÷ Stop
distance` has no answer without a Stop, so there would be no Plan for the
reason to be attached to. `applyRules` turns such a verdict into a `rejected`,
not a `blocked`, so the app never renders a "why are you doing it anyway?" box
above a button that cannot work — a dead end in the seconds before a trade is
worse than a block. Story 11 is also the only story in spec.md that says
"**unable** to" rather than "blocked", which reads as the same judgement. The
designed route for this case is ticket 06's Abandoned Plan reason "no valid
stop", which keeps the skip in the log as data.

This is a third axis the spec did not name, so challenge it if the intent was
that a Plan may be sized against a Stop of zero.

**The Open button stays on offer while a Position is live.** Ticket 04 hid it;
hiding a block is the one thing this app must not do, because the trade then
happens off the record. Reopening a Plan that is *already* live is still a flat
rejection — that is a tap that means nothing, not a Rule to argue with.

**One button, two states.** `useSubmission` owns the whole Override
interaction, so no component decides anything: submit sends the command, a
block comes back and renders, and the same button — now reading "Create Plan
anyway" — sends again with the typed reason. The reason is passed through
untouched; whether it is empty is the core's call and is tested there.

**From code review.** Standards and Spec axes ran in parallel.

- The no-Stop dead end was the most serious finding and is gone (above). The
  Spec axis put it exactly right: the outcome was defensible, the modelling was
  not — a `blocked` that no Override could answer is the dead end story 17
  forbids, and the fix was to model the distinction rather than document it.
- `RuleVerdict` no longer carries the Rule's name or its timing. The name went
  because `ruleName(ruleId)` already turned an id into words for `Violations`,
  and two paths to the same string drift; the timing went because nothing reads
  it — it belongs on `Rule`, where the spec puts it, until ticket 08.
- `RuleBlock` and the relabelled submit button were the same decision written
  in two components. They are now one `Override` — the glossary's own word for
  what it does.
- Renamed away from glossary nouns: `rule()`/`Ruling` in `commands.ts` are
  `applyRules()`/`RuleOutcome`, and `clearProblem` is `clearOutcome`.
- The two seam-2 journeys stopped reading the log by index, which spec.md's
  Testing Decisions forbid as an ordering artifact.
- Kept, with reasons: the per-verdict command-type guards in `rules.ts` (the
  alternative, an `appliesTo` field, needs a cast to erase the generic and
  trades a checked narrowing for an unchecked one); `Violations` rendered on
  rows, which is ticket 09's story 39 but is the only way this ticket's
  "permanently attached" is visible at all; and both journeys, because the two
  forms are separately wired and the second replaces a ticket-04 test that
  pinned the now-removed hiding of the Open button.

`npm run lint`, `npm run typecheck`, `npm test` (181 tests) and `npm run build`
all pass.
