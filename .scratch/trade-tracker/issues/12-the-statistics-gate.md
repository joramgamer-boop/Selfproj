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

- [ ] A "n / 30 Trades logged" counter is visible, counting closed Trades only
- [ ] **No win rate, Expectancy, Capture Rate, fee drag or equity curve is
      rendered below 30 closed Trades**, even though the computations exist
- [ ] At 30 or more closed Trades, the app shows: win rate, average win R, average
      loss R, Expectancy per Trade, average Capture Rate, total fee drag as a
      percentage of total Risk taken, max Drawdown, and an equity curve
- [ ] Abandoned Plans are excluded from every one of those figures
- [ ] Trades with a Violation are identifiable within the statistics, so rule
      breaks can be compared against rule-following Trades
- [ ] Statistics are computed in the core and gated at the render boundary, not by
      withholding the computation
- [ ] Core tests cover each aggregate against a hand-worked fixture set, and
      confirm the gate opens at exactly 30
- [ ] `npm run lint` and `npm test` pass
