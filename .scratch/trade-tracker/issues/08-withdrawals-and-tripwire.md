# 08 — Withdrawals, Peak Balance and the drawdown tripwire

**What to build:** I can always record a withdrawal — the app warns me loudly but
never refuses. And when I'm 20% down from my Peak Balance, the app stops me
planning new trades until I confirm I've reviewed the log.

**Blocked by:** 05 — Rule engine and overrides.

**Status:** ready-for-agent

**The asymmetry that matters:** the drawdown tripwire acts *before* a trade, so it
can genuinely block. A withdrawal has already happened, so blocking it would only
mean refusing to record it — and since every future position size derives from the
Ledger, one unrecorded withdrawal silently corrupts the sizing of every trade
after it. The Ledger must never refuse reality.

- [ ] Withdrawals are recordable and always accepted into the Ledger
- [ ] A withdrawal that touches the base, or occurs before the account has
      doubled, produces a prominent warning and a flag on the entry — never a
      block
- [ ] Peak Balance is derived from the Ledger and always visible
- [ ] Current Drawdown from Peak Balance is derived and always visible
- [ ] Rule: at 20% Drawdown, creating a new Plan is blocked until a log review is
      acknowledged; the acknowledgement is a recorded event
- [ ] The tripwire re-arms if Drawdown recovers and later falls back past 20%
- [ ] Core tests cover Peak Balance across deposits, withdrawals and losing
      Trades, and the tripwire firing, clearing and re-arming
- [ ] `npm run lint` and `npm test` pass
