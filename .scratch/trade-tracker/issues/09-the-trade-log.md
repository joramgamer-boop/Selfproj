# 09 — The Trade log

**What to build:** I can scroll my whole history — Trades, Abandoned Plans and all
— and see for each Trade what it actually cost or made me in R, how much of the
available move I kept, and whether I broke a rule to take it.

**Blocked by:** 04 — Position lifecycle.

**Status:** ready-for-agent

**Note on ordering:** this is deliberately not blocked on 05. The log renders
first and simply gains a Violations column once Violations exist.

- [ ] A list view shows every Trade and Abandoned Plan in reverse chronological
      order
- [ ] Each Trade row shows derived 1R, R-multiple (from P&L net of fees) and
      Capture Rate
- [ ] Capture Rate is shown for losers as well as winners, so round-trips are
      visible at a glance
- [ ] Each row shows its Exit Reason
- [ ] Violations and the above-default-Risk flag are visible on the row without
      opening it
- [ ] A detail view shows every logged and derived field for one Trade, including
      notes and any Stop moves
- [ ] **No aggregate performance statistics appear in this ticket** — see 12
- [ ] Core tests cover R-multiple and Capture Rate derivation for a winner, a
      loser, a round-trip loser and a scaled exit
- [ ] `npm run lint` and `npm test` pass
