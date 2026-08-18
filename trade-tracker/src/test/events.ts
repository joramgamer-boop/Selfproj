import type { PlanCreated, TradeTrackerEvent } from '../core/events';

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
    ...fields,
  };
}

export function riskDefaultChanged(riskFraction: number, at: string): TradeTrackerEvent {
  return { type: 'RiskDefaultChanged', at, riskFraction };
}
