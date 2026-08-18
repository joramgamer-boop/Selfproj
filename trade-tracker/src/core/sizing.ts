import { toCents } from './money';
import type { PlanInputs } from './plan';
import { isPlannableRiskFraction } from './risk';

export interface SolvedSizing {
  /** Dollars lost if the Stop hits. Chosen first; everything else solved from it. */
  readonly risk: number;
  readonly notional: number;
  readonly margin: number;
}

export type Sizing =
  | ({ readonly outcome: 'sized' } & SolvedSizing)
  | { readonly outcome: 'unsizable'; readonly reason: string };

/**
 * The arithmetic, and only the arithmetic: this refuses figures that no
 * Notional can be solved from, and nothing else.
 *
 * The fold uses this rather than `sizeNewPlan` on purpose. A Plan already in
 * the log is a fact, and reporting a fact is not the moment to re-argue
 * whether it should have been allowed — the policy below can tighten later,
 * and Rules in ticket 05 can be overridden, and neither may make an existing
 * row unreadable.
 */
export function solveSizing(balance: number, inputs: PlanInputs): Sizing {
  const refusal = whatCannotBeSolved(balance, inputs);
  if (refusal) return { outcome: 'unsizable', reason: refusal };

  const stopDistance = Math.abs(inputs.entryPrice - inputs.stopPrice);
  const risk = toCents(balance * inputs.riskFraction);
  // Risk ÷ Stop distance as a *fraction* of entry, which is Risk × entry over
  // the distance in price.
  const notional = toCents((risk * inputs.entryPrice) / stopDistance);

  return {
    outcome: 'sized',
    risk,
    // Margin is solved from the Notional actually shown, so the figure typed
    // into the exchange belongs to the size on screen.
    margin: toCents(notional / inputs.leverage),
    notional,
  };
}

/**
 * The gate a Plan must pass before it may be created: the arithmetic above,
 * plus the policy that only applies to a Plan not yet written down. The live
 * preview and the command both call this, so the screen can never show a size
 * the app would then refuse to record.
 */
export function sizeNewPlan(balance: number, inputs: PlanInputs): Sizing {
  if (!isPlannableRiskFraction(inputs.riskFraction)) {
    return { outcome: 'unsizable', reason: 'Risk must be between 2% and 3% of Balance.' };
  }

  // Not needed to solve a size, but a liquidation price on the far side of
  // entry is impossible under isolated margin, and storing one would poison
  // the Liquidation Buffer Rule that ticket 05 builds on this field.
  const impossible = wrongSideLiquidation(inputs);
  if (impossible) return { outcome: 'unsizable', reason: impossible };

  return solveSizing(balance, inputs);
}

function whatCannotBeSolved(balance: number, inputs: PlanInputs): string | null {
  if (!(Number.isFinite(balance) && balance > 0)) {
    return 'Record a Deposit first — Risk is a share of Balance.';
  }
  if (!Number.isFinite(inputs.riskFraction) || inputs.riskFraction <= 0) {
    return 'Risk must be a share of Balance above zero.';
  }
  if (!isPrice(inputs.entryPrice)) return 'Entry price must be above zero.';
  if (!isPrice(inputs.stopPrice)) return 'Stop must be above zero.';
  if (!(Number.isFinite(inputs.leverage) && inputs.leverage >= 1)) {
    return 'Leverage must be at least 1.';
  }

  // A Stop the wrong side of entry is not a wide Stop, it is a different
  // trade: the distance would still solve to a size, and the size would be
  // nonsense. A Stop *at* entry solves to an infinite one.
  if (inputs.direction === 'long' && inputs.stopPrice >= inputs.entryPrice) {
    return 'The Stop on a long must sit below the entry price.';
  }
  if (inputs.direction === 'short' && inputs.stopPrice <= inputs.entryPrice) {
    return 'The Stop on a short must sit above the entry price.';
  }

  return null;
}

function wrongSideLiquidation(inputs: PlanInputs): string | null {
  if (!isPrice(inputs.liquidationPrice)) return 'Liquidation price must be above zero.';
  if (inputs.direction === 'long' && inputs.liquidationPrice >= inputs.entryPrice) {
    return 'The liquidation price on a long must sit below the entry price.';
  }
  if (inputs.direction === 'short' && inputs.liquidationPrice <= inputs.entryPrice) {
    return 'The liquidation price on a short must sit above the entry price.';
  }
  return null;
}

function isPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
