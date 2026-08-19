# 06 — Abandon a Plan

**What to build:** When I size a trade and then don't take it, I record why in one
tap. The skip stays in my log permanently, but never pollutes my win rate.

**Blocked by:** 03 — Plan sizer.

**Status:** ready-for-agent

**Why it matters:** skipping bad setups is part of the edge, and "price ran away"
accumulating over time is direct evidence of the entry-lag failure mode — which is
one of the three leaks this whole log exists to tell apart.

- [x] A Plan can be abandoned with a required reason from a fixed list: no valid
      stop / risk too large to size / price ran away / changed my mind
- [x] An Abandoned Plan remains in the log permanently and is visibly distinct
      from a Trade
- [x] Abandoned Plans are excluded from win rate, Expectancy and the closed-Trade
      count that gates statistics
- [x] Core tests confirm an Abandoned Plan does not affect Balance, Expectancy, or
      the Trade count
- [x] `npm run lint` and `npm test` pass
