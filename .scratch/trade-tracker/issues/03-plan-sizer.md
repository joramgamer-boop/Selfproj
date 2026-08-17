# 03 — Plan sizer

**What to build:** Before I enter a trade, I type my entry price, my Stop, my
leverage and the exchange's liquidation price, and the app tells me exactly how
big the Position should be. My dollar Risk is the largest thing on the screen. The
Plan is saved.

**Blocked by:** 01 — Scaffold and record a Deposit.

**Status:** ready-for-agent

**Reference:** ADR-0001 (1R is fixed at the original Stop).

- [ ] A Plan is created from entry price, Stop, direction, leverage and
      liquidation price; Balance comes from the Ledger and is never typed
- [ ] Notional is solved as Risk ÷ Stop distance and **cannot be typed by hand**
- [ ] Margin is derived as Notional ÷ leverage and shown as a small secondary
      figure
- [ ] Dollar Risk is rendered as the most prominent element on the screen
- [ ] 1R is recorded on the Plan at creation and is never recomputed thereafter
- [ ] A Risk default of 2% lives in settings; a Plan may use 2–3%, defaulting to
      the setting
- [ ] A Plan using more than the default Risk is flagged on the record
- [ ] Changing the Risk default is recorded as a timestamped event
- [ ] **No ROE figure appears anywhere in the app**
- [ ] The screen states that isolated margin is assumed
- [ ] A created Plan persists and is visible after reload
- [ ] Core tests cover the sizing math across tight and wide Stops, both
      directions, and the above-default Risk flag
- [ ] `npm run lint` and `npm test` pass
