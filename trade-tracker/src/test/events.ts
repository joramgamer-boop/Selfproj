import type { TradeTrackerEvent } from '../core/events';

/** Shared across all three seams so a stored event looks the same everywhere. */
export function deposit(amount: number, at: string): TradeTrackerEvent {
  return { type: 'Deposit', at, amount };
}
