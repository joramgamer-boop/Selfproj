import type { PlanInputs } from './plan';
import { sizeNewPlan, solveSizing } from './sizing';

/**
 * The worked figures come from the quick-reference table in
 * `trading-risk-framework-notes.md` (risk = $10): a 2% Stop sizes $500 of
 * Notional, 4% sizes $250, 8% sizes $125.
 */
const aLong: PlanInputs = {
  direction: 'long',
  entryPrice: 100,
  stopPrice: 96,
  leverage: 5,
  liquidationPrice: 80,
  riskFraction: 0.02,
};

/** The same trade the other way up: Stop and liquidation above entry. */
const aShort: PlanInputs = {
  ...aLong,
  direction: 'short',
  stopPrice: 104,
  liquidationPrice: 120,
};

describe('solving the Notional', () => {
  it('solves Notional as Risk over the Stop distance', () => {
    expect(sizeNewPlan(500, aLong)).toMatchObject({
      outcome: 'sized',
      risk: 10,
      notional: 250,
    });
  });

  it('sizes a bigger Notional for a tighter Stop, at the same Risk', () => {
    expect(sizeNewPlan(500, { ...aLong, stopPrice: 98 })).toMatchObject({
      risk: 10,
      notional: 500,
    });
    expect(sizeNewPlan(500, { ...aShort, stopPrice: 102 })).toMatchObject({
      risk: 10,
      notional: 500,
    });
  });

  it('sizes a smaller Notional for a wider Stop, at the same Risk', () => {
    expect(sizeNewPlan(500, { ...aLong, stopPrice: 92 })).toMatchObject({
      risk: 10,
      notional: 125,
    });
    expect(sizeNewPlan(500, { ...aShort, stopPrice: 108 })).toMatchObject({
      risk: 10,
      notional: 125,
    });
  });

  it('solves a short off the distance up to its Stop', () => {
    expect(sizeNewPlan(500, aShort)).toMatchObject({ risk: 10, notional: 250 });
  });

  it('derives Margin as Notional over leverage', () => {
    expect(sizeNewPlan(500, aLong)).toMatchObject({ notional: 250, margin: 50 });
    expect(sizeNewPlan(500, { ...aLong, leverage: 10 })).toMatchObject({
      notional: 250,
      margin: 25,
    });
    expect(sizeNewPlan(500, { ...aShort, leverage: 10 })).toMatchObject({
      notional: 250,
      margin: 25,
    });
  });

  it('takes Risk as the given share of the Balance it was handed', () => {
    expect(sizeNewPlan(1000, aLong)).toMatchObject({ risk: 20, notional: 500 });
    expect(sizeNewPlan(500, { ...aLong, riskFraction: 0.03 })).toMatchObject({ risk: 15 });
  });
});

describe('what cannot be sized', () => {
  it('refuses to size against an empty Ledger', () => {
    expect(sizeNewPlan(0, aLong)).toEqual({
      outcome: 'unsizable',
      reason: 'Record a Deposit first — Risk is a share of Balance.',
    });
  });

  it('refuses a Stop sitting at the entry price, which would size infinitely', () => {
    expect(sizeNewPlan(500, { ...aLong, stopPrice: 100 })).toMatchObject({
      outcome: 'unsizable',
    });
  });

  it('refuses a long whose Stop sits above entry', () => {
    expect(sizeNewPlan(500, { ...aLong, stopPrice: 104 })).toEqual({
      outcome: 'unsizable',
      reason: 'The Stop on a long must sit below the entry price.',
    });
  });

  it('refuses a short whose Stop sits below entry', () => {
    expect(sizeNewPlan(500, { ...aShort, stopPrice: 96 })).toEqual({
      outcome: 'unsizable',
      reason: 'The Stop on a short must sit above the entry price.',
    });
  });

  it('refuses a liquidation price on the wrong side of entry', () => {
    expect(sizeNewPlan(500, { ...aLong, liquidationPrice: 120 })).toMatchObject({
      outcome: 'unsizable',
    });
    expect(sizeNewPlan(500, { ...aShort, liquidationPrice: 80 })).toMatchObject({
      outcome: 'unsizable',
    });
  });

  it('refuses prices and leverage that are not real figures', () => {
    expect(sizeNewPlan(500, { ...aLong, entryPrice: 0 })).toMatchObject({ outcome: 'unsizable' });
    expect(sizeNewPlan(500, { ...aLong, stopPrice: Number.NaN })).toMatchObject({
      outcome: 'unsizable',
    });
    expect(sizeNewPlan(500, { ...aLong, leverage: 0 })).toMatchObject({ outcome: 'unsizable' });
    expect(sizeNewPlan(500, { ...aLong, liquidationPrice: Number.NaN })).toMatchObject({
      outcome: 'unsizable',
    });
  });

  it('refuses a Risk outside the 2–3% band, so the screen never shows a size it will not record', () => {
    expect(sizeNewPlan(500, { ...aLong, riskFraction: 0.05 })).toEqual({
      outcome: 'unsizable',
      reason: 'Risk must be between 2% and 3% of Balance.',
    });
    expect(sizeNewPlan(500, { ...aLong, riskFraction: 0.01 })).toMatchObject({
      outcome: 'unsizable',
    });
  });
});

describe('solving the size of a Plan already recorded', () => {
  // The fold has to be able to read back anything the log holds. Policy that
  // applied when a Plan was created must not decide whether it can be shown,
  // or tightening a Rule later would make old Plans vanish.
  it('still solves a Risk that today would be out of band', () => {
    expect(solveSizing(500, { ...aLong, riskFraction: 0.08 })).toMatchObject({
      outcome: 'sized',
      risk: 40,
      notional: 1000,
    });
  });

  it('still solves a Plan whose liquidation price makes no sense', () => {
    expect(solveSizing(500, { ...aLong, liquidationPrice: 120 })).toMatchObject({
      outcome: 'sized',
      notional: 250,
    });
  });

  it('refuses only what no size can be solved from', () => {
    expect(solveSizing(500, { ...aLong, stopPrice: 100 })).toMatchObject({
      outcome: 'unsizable',
    });
  });
});
