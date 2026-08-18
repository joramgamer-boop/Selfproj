import type { PlanCreated, PositionClosed, TradeTrackerEvent } from '../core/events';
import type { Violation } from '../core/rules';

/** Shared across all three seams so a stored event looks the same everywhere. */
export function deposit(amount: number, at: string): TradeTrackerEvent {
  return { type: 'Deposit', at, amount };
}

/**
 * A long with a 4% Stop at 2% Risk — the middle row of the source notes' table.
 * Override only the field a test is actually about.
 */
export function planCreated(
  fields: Partial<Omit<PlanCreated, 'type'>> & { at: string },
): TradeTrackerEvent {
  return {
    type: 'PlanCreated',
    id: 'plan-1',
    direction: 'long',
    entryPrice: 100,
    stopPrice: 96,
    leverage: 5,
    liquidationPrice: 80,
    riskFraction: 0.02,
    violations: [],
    ...fields,
  };
}

export function positionOpened(
  at: string,
  planId = 'plan-1',
  violations: Violation[] = [],
): TradeTrackerEvent {
  return { type: 'PositionOpened', at, planId, violations };
}

/**
 * The winner that runs a little past the exit: +$25 gross on the Plan above,
 * $1 of fees, and a Best Price the exit did not quite reach.
 */
export function positionClosed(
  fields: Partial<Omit<PositionClosed, 'type'>> & { at: string },
): TradeTrackerEvent {
  return {
    type: 'PositionClosed',
    planId: 'plan-1',
    // Absent a correction, what happened is what the clock said happened.
    openedAt: fields.at,
    closedAt: fields.at,
    entryPrice: 100,
    exitPrice: 110,
    bestPrice: 114,
    fees: 1,
    exitReason: 'take-profit hit',
    scaledIn: false,
    scaledOut: false,
    notes: '',
    ...fields,
  };
}

export function riskDefaultChanged(riskFraction: number, at: string): TradeTrackerEvent {
  return { type: 'RiskDefaultChanged', at, riskFraction };
}
