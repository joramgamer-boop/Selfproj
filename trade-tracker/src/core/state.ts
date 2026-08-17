import type { TradeTrackerEvent, TradeTrackerEventType } from './events';
import { toCents } from './money';

/** One movement of the Balance, in the order it was recorded. */
export interface LedgerEntry {
  /** Position in the event log. Stable because the log is append-only. */
  readonly seq: number;
  readonly kind: TradeTrackerEventType;
  readonly at: string;
  /** Signed: credits are positive. */
  readonly amount: number;
  readonly balanceAfter: number;
}

export interface DerivedState {
  /** Derived from the Ledger, never stored and never typed. */
  readonly balance: number;
  readonly ledger: readonly LedgerEntry[];
}

export const emptyState: DerivedState = {
  balance: 0,
  ledger: [],
};

/**
 * Folds the whole log into everything the app can show. Pure: same events in,
 * same state out, no clock and no storage.
 */
export function deriveState(events: readonly TradeTrackerEvent[]): DerivedState {
  const ledger: LedgerEntry[] = [];
  let balance = 0;

  events.forEach((event, seq) => {
    switch (event.type) {
      case 'Deposit':
        balance = toCents(balance + event.amount);
        ledger.push({
          seq,
          kind: event.type,
          at: event.at,
          amount: event.amount,
          balanceAfter: balance,
        });
        break;
      default:
        // Unreachable while Deposit is the only event type. The switch is here
        // so that the next event type has to say how it moves the Balance,
        // rather than falling through and silently leaving it unchanged —
        // which would make every figure derived after it plausible and wrong.
        // Once a second type exists, `event` narrows to never here and an
        // unhandled one becomes a compile error.
        throw new Error(`Event not folded into derived state: ${event.type}`);
    }
  });

  return { balance, ledger };
}
