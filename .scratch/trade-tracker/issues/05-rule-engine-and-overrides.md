# 05 — Rule engine and overrides

**What to build:** When a Plan breaks one of my rules, the app stops me and tells
me which rule. I can always proceed anyway by typing why — and that reason is
permanently attached to the trade as a Violation.

**Blocked by:** 04 — Position lifecycle.

**Status:** ready-for-agent

**Why overridable:** the app has no power over the exchange. A rule that can never
be broken gets bypassed by simply not opening the app, and an unlogged trade is
worse than a logged Violation because it also corrupts the Ledger.

- [ ] Rules are modelled as data — an id, a verdict function over derived state
      and the proposed command, and a pre-fact/post-fact classification
- [ ] Command evaluation returns either the events to append or the blocking Rule
      verdicts; **components never decide verdicts**
- [ ] Rule: a Plan with no Stop is blocked
- [ ] Rule: a Plan whose Stop sits further than 50% of the distance from entry to
      the liquidation price is blocked
- [ ] Rule: opening a Position while another is open is blocked
- [ ] Any block can be overridden by typing a reason; the reason is required and
      cannot be empty
- [ ] An override records a Violation permanently on the resulting Plan or Trade,
      naming the Rule and carrying the reason
- [ ] Core tests cover each Rule at its boundary, the override path, and that a
      Violation survives the fold onto the closed Trade
- [ ] `npm run lint` and `npm test` pass
