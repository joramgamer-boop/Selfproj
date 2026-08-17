# My Trading Risk Framework — Notes to Self

*Built from a review session, August 2026. Read this before funding the account back up.*

---

## 1. The core rule: risk is a dollar amount, not a margin amount

**"Risking 2%" means the dollar amount I lose when my stop hits equals 2% of my current balance.** That's the anchor for everything else.

- Margin ≠ risk. Margin is just the cash posted to hold a position. It is an **output**, not something I set first.
- The stop loss is the mechanism that turns "I'm willing to lose 2%" into an actual enforced fact. Without a correctly placed stop, the market can take far more than I agreed to (up to full liquidation).

### The correct order of operations, every trade:
1. Decide the dollar risk: **2–3% of current balance.**
2. Look at the **chart** — find the price where my trade idea is proven wrong. That's the stop. (Not a fixed ROE% habit — the chart decides, not a number I like.)
3. Solve for position size: **Position (notional) = Risk $ ÷ Stop distance (%)**
4. Margin = Position ÷ Leverage. This is whatever it needs to be — it varies every trade. Tighter stop → bigger position → same $ risk. Wider stop → smaller position → same $ risk.
5. Place the stop **above liquidation**, always, with real buffer.

### Quick reference table (risk = $10 example)
| Stop distance | Position (notional) | Margin @ 5x | Margin @ 10x |
|---|---|---|---|
| 2% (tight) | $500 | $100 | $50 |
| 4% | $250 | $50 | $25 |
| 8% (wide) | $125 | $25 | $12.50 |

**The margin is NOT fixed.** It swings every trade depending on stop distance and leverage. The $ risk is the only constant.

---

## 2. Reading the screen correctly (ROE% vs real risk)

- The green/red percentage shown on the exchange (e.g. "+40% unrealized PnL") is **ROE — return on margin**, not return on the position and not return on your account.
- The **same $10 loss (1R)** can show up as −20%, −40%, −50%, or −80% ROE depending on how much margin is behind that trade. ROE% is not a fixed target — it's just a readout.
- **Never anchor a stop to a fixed ROE% habit** (e.g. "always −40%"). That number means a different dollar amount every time depending on margin. Anchor to the dollar loss instead; let the ROE% be whatever it turns out to be.
- 100% ROE = full margin gone. On the loss side, −100% ROE is liquidation. My stop must always fire well before that.

---

## 3. Sequential vs. concurrent trading

- **Sequential** (one trade at a time, wait for close, then size the next off the real new balance) = the safe default. This is what kept the account alive through year one.
- **Concurrent** (multiple trades open at once) does NOT make each trade individually riskier — but it **stacks** risk, and crypto coins are correlated. In a market-wide dump, "3 independent 2% trades" can become one 6% hit, all at once.
- If/when I go concurrent: use a **total open-risk cap** across all positions combined (e.g. 6% max), sized off actual current balance — never off a hypothetical "balance minus a pending trade."
- Compounding only happens when a trade **closes and settles.** Pending trades don't reduce my risk — they add to it.
- Simulation confirmed: sequential and concurrent produced nearly identical *returns* on the same trades, but concurrent carried **3x the peak risk** for no extra reward. Sequential is the better risk-adjusted choice until execution is rock-solid and a cap is in place.

---

## 4. Reward:risk and expectancy — the math that decides everything

**Breakeven win rate = 1 ÷ (1 + R:R)**

| R:R | Breakeven win rate |
|---|---|
| 1:1 | 50% |
| 2:1 | 33.3% |
| 3:1 | 25% |

**Expectancy = (win rate × avg win) − (loss rate × avg loss)**, measured in R.
- Positive expectancy = the account grows over time. Negative = it bleeds, no matter how good it feels in the short run.
- Structure (sizing, sequencing, caps) doesn't create an edge — it only controls how safely a real edge compounds, or how slowly a bad one bleeds. **Always check whether the edge is actually positive before scaling anything up.**

---

## 5. What the signal-group data review actually showed

- The weekly "% RATE PRIVATE" numbers (e.g. +1964%, +998%) are **summed ROE across many trades**, often opened concurrently and correlated — not an achievable account return. Treat any "track record" presented this way with heavy skepticism.
- My own real result: **$80 → ~$110+ over a year (roughly +37% to +90% depending on withdrawals)**, trading sequential, public signals only. That's the honest number, not the group's headline.
- Simulation reverse-engineered this: my real result implies roughly a **55–65% "capture rate"** on winning trades (see below). That's a real edge, but a thin, fragile one — largely flattered by a favorable year with no genuine losing stretch.
- Full-year Monte Carlo simulation (mixing in real losing weeks, not just the favorable 5-week sample) showed: **at 55% capture, every risk level tested was flat-to-losing at the median, and higher risk (5–8%) added a serious chance of total ruin (10–40%+).**

---

## 6. Capture rate — the single most important lever

**Capture rate = (the move I actually kept) ÷ (the move that was available on the trade).**

Example: a trade runs to +100% at its peak, I exit at +55% → 55% capture.

- Losses are naturally capped by the stop (~1R every time). Wins are the *only* variable part of the edge — so capture rate is the dial that controls the entire size of my edge.
- **Improving capture rate is the only lever that raises returns AND lowers drawdown at the same time.** Every other lever (more risk, more trades) is a trade-off. This one is free.
- Simulation: moving from 55% → 70% capture, at the *same* 2% risk, flipped the account from "typically loses over a realistic year" to "typically grows several times over, with near-zero ruin risk." Bigger lever than any risk % change tested.

### Where capture rate leaks:
- **Exiting too early** — fear of giving back profit, closing at +30% on a move that runs to +100%.
- **Exiting too late / round-tripping** — greed, no exit plan, watching a big winner collapse back to nothing.
- **Entry lag** — as a signal follower, getting in late after the move has already started.
- **Fees/slippage** — smaller, but real, friction on every trade.

**Action for the break:** figure out honestly which failure mode is mine (early exit vs. round-trip vs. entry lag) — that determines what to actually fix.

---

## 7. Account & behavior rules for the rebuild

0. **These rules manage risk — they don't create an edge.** Keep verifying the edge is real via the log (below).
1. **The account is untouchable.** No random withdrawals — this was the single biggest leak last time (drained a compounding base for "random reasons").
2. If I do withdraw: by rule, not mood (e.g. only after the account doubles, and only a portion of the profit — never the base).
3. **Feed the base** with real capital over time rather than trying to force growth through more risk.
4. **Fixed 2–3% risk per trade**, sized off current balance. Do not go higher — simulation showed 5%+ carries real ruin risk over a realistic year.
5. Risk = dollar amount defined by the stop, never by margin or a habitual ROE%.
6. **Every trade has a stop, placed above liquidation, before entering.** No exceptions.
7. **Stay sequential.** One, maybe two trades at a time. Revisit concurrency only after (a) verified real expectancy from the log, and (b) a strict total-risk cap is defined.
8. Only take signals where I can define a real stop and size to my fixed risk. Skipping bad setups is part of the edge.
9. After a loss: resize off the new balance and take the next planned trade. No revenge sizing.
10. **Log every real trade** — entry, exit, $ P&L, and what the "available" move was (for capture rate). After 30–50 trades, calculate real win rate, real capture rate, real expectancy. Let the log — not the feeling — decide whether to continue, adjust, or stop.

**Drawdown tripwire:** if the account draws down 20% from a peak, pause and review the log before continuing.

---

## 8. Starting capital — the actual filter

Not a fixed dollar number. Use two tests, take whichever gives the smaller amount:
1. **Fully affordable to lose** — if it hit zero tomorrow, it changes nothing about rent/bills/emergencies.
2. **2% of it feels real** — meaningful enough to care about, but losing it wouldn't be distressing.

Don't front-load a large sum. Fund an amount that clears both bars, trade 30–50 logged trades to confirm the edge is real post-break, **then** scale capital up as the log confirms it — not ahead of it.

---

## 9. The one-paragraph version

*Risk a fixed % (2–3%) of current balance per trade, defined by where the chart says I'm wrong — never by margin or habitual ROE%. Stay sequential until execution is proven and a total-risk cap exists. Don't touch the account for random withdrawals. The real lever for growth isn't more risk or more trades — it's raising my capture rate on winners, because that's the only thing that raises returns while also lowering risk. Log every real trade and let the data, not the feeling, tell me if the edge is actually there.*

---

## 10. The trade log — start this from trade #1

Log these fields for **every** trade, no exceptions. A plain spreadsheet is fine. Consistency from the first trade matters more than the format.

| Field | Why it matters |
|---|---|
| Date / time | Sequencing, session patterns |
| Coin / pair | Per-asset performance |
| Direction (long/short) | Directional bias check |
| Entry price | Baseline for everything |
| Stop price (as placed) | Defines 1R |
| Exit price (actual fill) | Real result |
| **Peak price reached before exit** | **Required for capture rate — the field people forget** |
| Balance before trade | Confirms the 2–3% sizing was correct |
| Dollar P&L (realized) | Ground truth |
| Notes (why entered, why exited) | Finds the behavioral leaks |

Everything else is derived from these:
- **1R** = |entry − stop| × position size
- **R-multiple** = realized P&L ÷ 1R
- **Available move** = |peak − entry|
- **Capture rate** = (exit − entry) ÷ (peak − entry), on winners
- **Expectancy** = (win rate × avg win R) − (loss rate × avg loss R)

---

## 11. Future project — trade analyzer (build in Claude Code later)

**Do not build this until there are 30–50 logged trades to feed it.** The tool is worthless against an empty log; the log is the point.

**Scope:** a local, read-only analysis script. **No trade execution. No auto-trading. No withdrawal permissions on the API key.**

Rough spec to hand to Claude Code:

- Pull fill history from the MEXC API using a **read-only** key (or import the CSV export / my manual log).
- Reconstruct closed positions from fills (entry, exit, size, fees).
- Compute per trade: 1R, R-multiple, realized P&L, hold duration.
- Compute **capture rate** per winning trade — needs the peak price during the hold, so either log it manually or pull candle data for the hold window.
- Aggregate: win rate, avg win R, avg loss R, expectancy per trade, max drawdown, total fee drag as a % of total risk taken.
- Break results down by coin, by direction, by weekday/session, and by hold duration — to find where the leaks actually are.
- Output: a simple summary table plus an equity curve.

**The one question this tool exists to answer:** *what is my real capture rate, and is my expectancy actually positive after fees?*

Security notes for when I build it: read-only API key only, withdrawals disabled, IP whitelist if MEXC supports it, keys in environment variables and never committed to a repo. Check MEXC's terms on API use before connecting anything.

**Sequence reminder:** trade manually → log rigorously → build the analyzer → read the answer → *only then* decide about scaling capital or any kind of automation.

---

## 12. Small-account simulation results (for expectation-setting)

All figures are Monte Carlo medians over thousands of runs, using the 5-week signal sample blended with realistic losing weeks, sequential trading, fee drag included. **Directional, not predictive** — capture rate is estimated, sample is small.

### $30 start, static (no deposits)
| Horizon | Risk | Median outcome | Ruin risk |
|---|---|---|---|
| 6 months | 2% | ~$15 | 0% |
| 12 months | 2% | ~$7 | 1.3% |
| 12 months | 3% | ~$3 | **~20%** |
| 12 months (70% capture) | 2% | ~$65 | 0% |

### $100 start, 2 months
| Execution | Risk | Median | Worst 10% | Avg drawdown | % of runs ending down |
|---|---|---|---|---|---|
| 55% capture (current) | 2% | **$84** | $45 | 42% | **63%** |
| 55% capture | 3% | $74 | $30 | 55% | 64% |
| 70% capture | 2% | **$122** | $59 | 36% | 37% |
| 70% capture | 3% | $130 | $44 | 49% | 38% |

### What these actually mean
- **At my current execution (~55% capture), every horizon and risk level loses money at the median.** More time trading = more bleed. This is the clearest signal in all the analysis that the edge may not be profitable as currently executed.
- **Raising risk from 2% → 3% made the median WORSE** while widening both tails. Higher risk cannot rescue a weak edge — it only amplifies whatever is already there.
- **At 70% capture, everything flips positive** at the same risk levels. The capture rate is the whole game.
- **Drawdowns are severe even at 2% risk** — ~42% average peak-to-trough over just two months. Expect to watch the account nearly halve at some point even in runs that end up profitable. This is where discipline actually breaks.
- **Two months is far too short to judge anything.** The 10th–90th percentile spread on $100 was $45–$167 on identical inputs. A good or bad result over that window is noise, not evidence.

### Practical conclusions
- **$30 is below the workable threshold** for live trading: exchange minimum order sizes, fee drag as a large fraction of a ~$0.60 risk, and contract rounding all break the fixed-risk model. Fine as a pure *measurement/habit* account with monthly deposits — but expect it to shrink, and budget it as tuition, not investment.
- **Things start working cleanly around $150–300** — position sizes clear exchange minimums and fees become a small fraction of risk.
- **$30/month deposits is a defensible plan** if framed correctly: the contributions, not trading returns, are what grow the account while I build habits and collect log data. Consider letting the balance accumulate toward $150–300 while trading only a portion of it.
- **The mechanical habits transfer; the emotional ones don't.** Risking $0.60 does not teach me how it feels to risk $30. Do not mistake discipline at $30 for discipline at $500 — scale up slowly.
