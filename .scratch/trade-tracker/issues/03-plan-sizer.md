# 03 — Plan sizer

**What to build:** Before I enter a trade, I type my entry price, my Stop, my
leverage and the exchange's liquidation price, and the app tells me exactly how
big the Position should be. My dollar Risk is the largest thing on the screen. The
Plan is saved.

**Blocked by:** 01 — Scaffold and record a Deposit.

**Status:** ready-for-agent

**Reference:** ADR-0001 (1R is fixed at the original Stop).

- [x] A Plan is created from entry price, Stop, direction, leverage and
      liquidation price; Balance comes from the Ledger and is never typed
- [x] Notional is solved as Risk ÷ Stop distance and **cannot be typed by hand**
- [x] Margin is derived as Notional ÷ leverage and shown as a small secondary
      figure
- [x] Dollar Risk is rendered as the most prominent element on the screen
- [x] 1R is recorded on the Plan at creation and is never recomputed thereafter
- [x] A Risk default of 2% lives in settings; a Plan may use 2–3%, defaulting to
      the setting
- [x] A Plan using more than the default Risk is flagged on the record
- [x] Changing the Risk default is recorded as a timestamped event
- [x] **No ROE figure appears anywhere in the app**
- [x] The screen states that isolated margin is assumed
- [x] A created Plan persists and is visible after reload
- [x] Core tests cover the sizing math across tight and wide Stops, both
      directions, and the above-default Risk flag
- [x] `npm run lint` and `npm test` pass

## Comments

**Implemented.** Sizing runs through one core module that both the live preview
and the `CreatePlan` command call, so the screen cannot show a size the app
would then refuse to record.

- `core/plan.ts` holds `Direction` and `PlanInputs` — the six figures the
  trader types. `PlanCreated`, `CreatePlan` and the derived `Plan` all extend
  it, so the shape is declared once and the log's types don't depend on the
  sizing module.
- `core/sizing.ts` splits deliberately in two. `solveSizing` is the arithmetic
  and refuses only what no Notional can be solved from; `sizeNewPlan` adds the
  policy that applies to a Plan not yet written down (the 2–3% band, a
  liquidation price on the wrong side of entry). The **fold uses the narrow
  one**: a Plan already in the log is a fact, and re-adjudicating it there
  would mean a later tightening of policy — or ticket 05's overridden Rules —
  could make an existing row unreadable, taking every other row with it.
- `core/risk.ts` owns the band, the default, and percent↔fraction conversion.
  Risk is carried to four decimal places because a field reading `2.9` arrives
  as `0.028999999999999998`.
- `core/ids.ts` is the id port ticket 01 deferred until Plans needed real ids.

**1R is derived, not stored** — the ticket says "recorded on the Plan at
creation", but spec.md is explicit the other way ("1R … derived by folding the
log, never stored … immutable by construction (ADR-0001)"), so the spec won.
`PlanCreated` holds only inputs; the fold reaches the Balance by replaying the
log up to that event and no further, so nothing appended later can move it.
Covered by "leaves 1R alone when a later Deposit raises the Balance".

**The Risk floor is a judgement call worth revisiting.** A Plan below 2% is
refused as well as one above 3%. The ticket says a Plan "may use 2–3%", and the
notes call for a *fixed* 2–3% per trade — quietly risking less on the
frightening trades makes R-multiples across the log incomparable. But nothing
explicitly asked for a floor, so if under-risking should be allowed, that is a
one-line change in `core/risk.ts`.

**Deliberately not done here:** the Liquidation Buffer Rule, the no-Stop block
and the override/Violation mechanism are ticket 05. This ticket only captures
the liquidation price — though it does refuse one on the physically impossible
side of entry, because storing that would poison the buffer Rule built on it.

**Known limitation:** "Risk is the most prominent element" is a CSS fact
(3.5rem against a 1.75rem Balance, which stepped down from 2.75rem). jsdom does
no layout, so the tests assert the figure and its value, not its size. That
claim rests on reading the CSS, not on seeing it rendered.

**From code review.** Standards and Spec axes ran in parallel.

- The fold re-adjudicating policy was the most serious finding; fixed by the
  `solveSizing` / `sizeNewPlan` split above, with three tests pinning it.
- Percent↔fraction arithmetic had leaked into all three components, against
  "no logic in components". It moved to `core/risk.ts` and `format.ts`. Doing
  so surfaced a real bug: `riskPercentOf` never multiplied by 100. `risk.test.ts`
  now covers the round-trip directly.
- Vocabulary: "Position" was being used for Plans that are not live, and
  "Position size" where CONTEXT.md wants "Notional".
- `toBasisPoints` returned a fraction, not basis points → `roundRiskFraction`.
  `fraction` vs `riskFraction` unified on one word per concept.
- Short Stops were only covered at one width; tight and wide now run both
  directions.
- `RiskDefaultSetting` never re-synced from the log — the same latent bug
  already fixed in `PlanSizer`.

**Deferred with reason:** `DepositForm`, `PlanSizer` and `RiskDefaultSetting`
now hold three copies of the same `saving`/`rejection` submit shape. The rule of
three is met, but the third copy is `DepositForm`, whose double-tap semantics
are load-bearing and which this ticket otherwise doesn't touch. Ticket 04 adds
two more forms (open Position, close Position) and will show the right shape.

`npm run lint`, `npm run typecheck`, `npm test` (102 tests) and `npm run build`
all pass.
