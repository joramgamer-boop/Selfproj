# Spec: Trade Tracker

Status: ready-for-agent

Vocabulary: `trade-tracker/CONTEXT.md`. Decisions: `trade-tracker/docs/adr/`.
Source document: `trade-tracker/trading-risk-framework-notes.md`.

## Problem Statement

I have a written risk framework and no way to follow it. Every rule in it — risk
2–3% of Balance, size solved from the Stop, one Position at a time, never widen a
Stop, don't touch the account — depends on me doing arithmetic correctly on a
phone in the seconds before I enter a trade, and then remembering to write the
result down afterwards.

Both halves fail in practice. The sizing math gets approximated, so "2% risk"
becomes whatever Margin felt right. The log doesn't get written, so after a year
of trading I still can't answer the only question that matters: is my Expectancy
positive after fees, and what is my real Capture Rate? Without a log there is no
way to tell a real edge from a favourable year, and no way to know whether the
losing trades are the ones where I broke my own rules.

A spreadsheet stores rows but cannot refuse anything. It will happily accept a
Plan with no Stop, a size that risks 8%, or a second Position while one is open.

## Solution

A phone-first, offline, installable app that sizes the trade *before* I take it
and keeps the record afterwards — where those are the same object rather than two
chores.

Before entering: I give it entry price, Stop and leverage. It reads Balance from
the Ledger, solves Notional and Margin, and shows me the dollar Risk in the
largest type on the screen. If the Plan breaks a Rule it blocks — but always lets
me through if I type a reason, which is then permanently attached to the Trade as
a Violation.

After closing: I record exit price, fees, Best Price and Exit Reason, and attach a
screenshot as Evidence. Realized P&L flows into the Ledger and the next Plan sizes
off the new Balance automatically.

The app deliberately shows me almost nothing about my performance until 30 Trades
are logged (ADR-0002). Until then it shows a counter. Its job in that period is to
make the record complete and honest, not to render statistics from noise.

## User Stories

### Sizing a trade

1. As a trader, I want to enter my entry price and Stop and have the app solve
   Notional for me, so that my dollar Risk is exactly 2% rather than whatever
   Margin I guessed at.
2. As a trader, I want the app to read my Balance from the Ledger rather than
   asking me for it, so that I cannot size off a stale or wishful number.
3. As a trader, I want Risk shown in dollars in the largest type on the screen, so
   that the number I committed to is the number I actually look at.
4. As a trader, I want Margin displayed as a small secondary figure, so that I can
   type it into the exchange without mistaking it for my Risk.
5. As a trader, I want to never see a ROE figure anywhere in the app, so that I
   don't rebuild the habit of anchoring my Stop to a familiar percentage.
6. As a trader, I want a default Risk of 2% that I can raise to 3% on a given
   Plan, so that I keep the flexibility I actually use.
7. As a trader, I want any Plan above my default Risk flagged, so that I can later
   check whether my higher-risk trades earned their extra risk.
8. As a trader, I want to enter leverage and see the resulting Margin, so that the
   figure I set on the exchange comes from the same calculation.
9. As a trader, I want to type the liquidation price the exchange shows me rather
   than have the app estimate it, so that the Liquidation Buffer check is never
   based on a guess that fails in the dangerous direction.
10. As a trader, I want the app to state that it assumes isolated margin, so that
    I am reminded the whole model breaks under cross.

### Rules and overrides

11. As a trader, I want to be unable to create a Plan without a Stop, so that
    every trade has a defined 1R and is therefore measurable.
12. As a trader, I want to be blocked when my Stop sits further than halfway to
    liquidation, so that my Stop always fires with real room to spare.
13. As a trader, I want to be blocked from opening a second Position while one is
    live, so that I stay sequential and don't stack correlated risk.
14. As a trader, I want to be blocked from widening a Stop on an open Position, so
    that I can't quietly turn a 1R loss into an account event.
15. As a trader, I want to tighten a Stop freely, so that normal trade management
    isn't treated as a rule break.
16. As a trader, I want new Plans blocked once I'm 20% down from Peak Balance
    until I confirm I've reviewed the log, so that the tripwire is something that
    happens to me rather than something I have to remember.
17. As a trader, I want to be able to override any block by typing a reason, so
    that I never end up trading off the record because the app wouldn't let me in.
18. As a trader, I want each override permanently recorded as a Violation on the
    row, so that my compliance becomes a column I can sort by.
19. As a trader, I want a loud warning rather than a block when I record a
    withdrawal, so that the Ledger still reflects reality.

### Recording a trade

20. As a trader, I want to take a Plan live as a Position with one action, so that
    the thing I sized is the thing that gets logged.
21. As a trader, I want to close a Position by entering exit price, fees and Best
    Price, so that the record is complete at the moment I still remember it.
22. As a trader, I want fees recorded as their own field, so that I can tell "my
    edge is negative" apart from "my edge is positive and fees are eating it".
23. As a trader, I want Best Price required on losers as well as winners, so that
    round-trips — my most expensive leak — are visible in the data.
24. As a trader, I want to pick an Exit Reason from a fixed list, so that an early
    exit can be told apart from a stop-out without me writing prose.
25. As a trader, I want to log a scaled exit as one Trade with a weighted-average
    exit price and a flag, so that Capture Rate still means something and I can
    later ask whether scaling out helps.
26. As a trader, I want timestamps filled in automatically but editable, so that
    logging a close two hours late doesn't fabricate a wrong hold duration.
27. As a trader, I want an edited timestamp marked as edited, so that I know which
    hold durations to trust.
28. As a trader, I want to attach a screenshot to a closed Trade, so that I have
    proof of the fill.
29. As a trader, I want the app to never read that screenshot, so that no figure
    in my log came from something that can be misread.
30. As a trader, I want to abandon a Plan with a one-tap reason, so that the trades
    I skip are recorded as data rather than vanishing.
31. As a trader, I want "price ran away" available as an abandon reason, so that
    entry lag accumulates somewhere I can see it.
32. As a trader, I want free-text notes on a Trade, so that behavioural leaks have
    somewhere to be written down.

### The account

33. As a trader, I want to record deposits, so that my monthly contributions are
    part of the Ledger and not mistaken for trading returns.
34. As a trader, I want Balance derived from the Ledger and never typed, so that
    it cannot drift from what actually happened.
35. As a trader, I want Peak Balance and current Drawdown always visible, so that
    I know where I stand relative to the tripwire before I plan a trade.
36. As a trader, I want the Ledger to accept every real event including bad ones,
    so that one unrecorded withdrawal doesn't silently corrupt the sizing of every
    trade after it.

### The log and what I'm shown

37. As a trader, I want a list of every Plan, Abandoned Plan and Trade, so that the
    whole history is in one place.
38. As a trader, I want 1R, R-multiple and Capture Rate derived and displayed per
    Trade, so that I never compute them by hand.
39. As a trader, I want Violations visible on the row, so that rule breaks are
    impossible to overlook when reviewing.
40. As a trader, I want a "n / 30 Trades logged" counter, so that the wait before
    statistics appear feels like progress.
41. As a trader, I want win rate, avg win/loss R, Expectancy, Capture Rate, fee
    drag and an equity curve once I pass 30 Trades, so that the log finally answers
    the question it exists for.
42. As a trader, I want no performance statistics before then, so that I don't
    steer by a number computed from noise.

### Durability

43. As a trader, I want the app installed on my home screen and working offline, so
    that it's available at the moment I'm sizing a trade and my data isn't evicted
    by the browser.
44. As a trader, I want a CSV export of closed Trades, so that the future analyzer
    — or a spreadsheet — can read my log.
45. As a trader, I want a full JSON backup including screenshots, so that a lost
    phone doesn't cost me the log.
46. As a trader, I want to import that backup and get everything back, so that the
    export is a backup rather than just a file.
47. As a trader, I want new Plans blocked after 10 unexported Trades, so that
    backing up is enforced the same way every other rule is.
48. As a trader, I want none of my data to leave my phone, so that there's no
    account, no login and nothing of mine on anyone's server.

## Implementation Decisions

**Stack.** React + Vite + Vitest with TypeScript, own toolchain in `trade-tracker/`
per the repo's project-per-folder convention. TypeScript departs from
`tic-tac-toe/`'s plain JS deliberately: this app's value is derived arithmetic,
where a wrong type produces a plausible wrong number rather than a crash.

**Event-sourced core.** State is an append-only sequence of events — `Deposit`,
`Withdrawal`, `PlanCreated`, `PlanAbandoned`, `PositionOpened`, `StopMoved`,
`PositionClosed`, `RiskDefaultChanged`, `Exported`, `DrawdownReviewAcknowledged`.
Balance, Peak Balance, Drawdown, the open Position, 1R, R-multiple, Capture Rate,
Expectancy and every Rule verdict are **derived by folding the log**, never stored.
This is what makes the entire domain a pure function and keeps 1R immutable by
construction (ADR-0001).

**Command evaluation.** The core exposes command evaluation separately from
application: given current derived state and a proposed command, it returns either
the events to append or the set of Rule verdicts that block it. The UI renders
verdicts; it never decides them.

**Rules are data.** Each Rule has an id, a verdict function over derived state and
command, and a classification: *pre-fact* (blocks, overridable) or *post-fact*
(warns only). Withdrawal is the only post-fact Rule — the Ledger must never refuse
something that already happened, since every subsequent position size derives from
it. Overriding appends the reason to the resulting event, producing a Violation.

**No logic in components.** Components render what the core returns and dispatch
commands back. No arithmetic, no Rule evaluation, no Balance derivation in a
component or hook. A Rule check that leaks into the UI is untestable at the
primary seam and is a spec violation.

**Storage port.** One narrow interface for reading and appending events and storing
Evidence blobs. Two implementations: in-memory (tests, and the store the UI tests
run against) and IndexedDB (production). IndexedDB rather than localStorage because
Evidence blobs are hundreds of kilobytes and localStorage would fill within ten
Trades. Persistent-storage permission is requested at install.

**Clock is injected.** Timestamps come from a clock passed into the core, so
time-dependent behaviour is deterministic in tests and editable timestamps are
modelled as data rather than as an ambient side effect.

**Statistics gate.** Statistics are computed in the core and gated at the render
boundary on closed-Trade count ≥ 30 (ADR-0002). Abandoned Plans do not count.

**Screenshots.** Stored as blobs against a Trade, rendered on demand, never parsed
(ADR-0003).

**Liquidation.** The liquidation price is an input, never a calculation — exchange
maintenance-margin tiers are not modelled. Isolated margin is assumed and stated in
the UI.

**Single account.** No Account entity. Re-keying a few dozen rows later, if a second
account is ever funded, is a trivial migration and does not justify the complexity
now.

**Export formats.** CSV is one row per closed Trade with the logged fields, fees,
Violations and derived R — flat and spreadsheet-readable. JSON is a complete
event-log dump including Evidence, and import restores from it.

## Testing Decisions

A good test here asserts on **observable behaviour through a seam** — the derived
state and Rule verdicts the core returns, or what a user sees and can do on screen.
It never asserts on event ordering as an implementation artifact, internal
function calls, or component structure. Tests are written in the glossary's
vocabulary: a test is named for a Plan being blocked, not for a validator returning
false.

**Three seams, mirroring the precedent next door** (`gameLogic.test.js` pure logic,
`useGame.test.js` hook, `App.test.jsx` rendered app):

1. **The domain core — primary.** Pure, no DOM, no storage, injected clock. Nearly
   all tests live here: every Rule verdict, every derived figure, the statistics
   gate. Tests read as a sequence of commands and an assertion on what came back —
   deposit 100, plan a 4% Stop at 2% Risk, assert Notional; widen a Stop, assert
   the block and the Violation; close at −1R with a distant Best Price, assert the
   round-trip is visible. This is where the money math is proven, and it should be
   exhaustive because it is cheap.

2. **The rendered app over an in-memory store.** React Testing Library, a handful
   of complete journeys: plan → open → close a winner; abandon a Plan; hit a block
   and override it with a typed reason; trip the export nag. These catch wiring
   the core tests cannot see. Deliberately few — if a behaviour can be tested at
   seam 1, it belongs at seam 1.

3. **A storage-port contract test.** One shared suite run against *both* the
   in-memory and IndexedDB implementations (via `fake-indexeddb`). It earns a third
   seam because data loss is this app's catastrophic failure and round-tripping a
   Trade with an Evidence blob through the real adapter would otherwise go untested
   until it mattered.

`npm run lint` and `npm test` pass on every ticket.

## Out of Scope

- **Any exchange connection.** No API keys, read-only or otherwise. No fill import,
  no candle data, no price feeds, no execution — this app never talks to MEXC.
- **The analyzer.** Per-coin, per-direction, per-session and per-hold-duration
  breakdowns belong to the separate future project the source notes describe, and
  only once 30–50 Trades exist to feed it.
- **Screenshot extraction** of any kind (ADR-0003).
- **Multiple accounts**, account switching, or multi-currency.
- **Concurrent Positions.** The sequential Rule is a block; the total open-risk cap
  the notes contemplate is not modelled because there is nothing to cap.
- **Any server component** — no backend, no auth, no sync, no cloud backup.
- **Automatic liquidation price calculation.**
- **Statistics before 30 Trades** (ADR-0002).
- **Notifications, reminders, or price alerts.**

## Further Notes

The app's authority is deliberately limited to what happens *before* a trade. It
cannot stop a trade on the exchange and it must never refuse to record one that
happened. Its actual power is that nothing happens off the record — which is why
every block is overridable and every override is permanent.

The single most likely way this project fails is not a bug: it's the log going
unfilled because the app was too slow or too annoying at the moment of a trade.
Friction at the Plan screen is the thing to guard against above correctness of
anything cosmetic.
