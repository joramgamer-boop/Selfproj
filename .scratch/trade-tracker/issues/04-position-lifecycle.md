# 04 — Position lifecycle

**What to build:** I take a Plan live as a Position, and later close it into a
Trade by entering what actually happened. My Balance moves by the realized P&L,
and my next Plan sizes off the new Balance automatically.

**Blocked by:** 03 — Plan sizer.

**Status:** ready-for-agent

**Reference:** ADR-0001. Note the Trade is one record even when the exit was
scaled — see `trade-tracker/CONTEXT.md`.

- [ ] A Plan can be opened as a Position; the app shows the open Position
      prominently
- [ ] Closing a Position requires exit price, fees, Best Price and an Exit Reason,
      and produces a Trade
- [ ] Exit Reason is a fixed list: stop hit / manual exit in profit / manual exit
      at a loss / take-profit hit / liquidated
- [ ] Best Price is required on **every** Trade, winners and losers alike
- [ ] Fees are recorded as their own field, separate from P&L
- [ ] Realized P&L is net of fees and appends to the Ledger; Balance moves
      accordingly
- [ ] A scaled entry or exit is recorded as a weighted average on the single
      Trade, with a scaled-out flag — never as two Trades
- [ ] Timestamps for open and close are auto-stamped from the injected clock and
      remain editable; an edited timestamp is marked as edited
- [ ] Free-text notes can be attached to a Trade
- [ ] Core tests cover the full Plan → Position → Trade fold, the Ledger effect of
      a winner and a loser, and that 1R still reflects the original Stop
- [ ] `npm run lint` and `npm test` pass
