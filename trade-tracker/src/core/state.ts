import type { TradeTrackerEvent, TradeTrackerEventType } from './events';
import { toCents } from './money';
import type { PlanInputs } from './plan';
import { DEFAULT_RISK_FRACTION } from './risk';
import { solveSizing } from './sizing';

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

/**
 * A Plan as the log has it: what was typed, plus everything solved from the
 * Balance standing when it was created. Because the fold reaches that Balance
 * by replaying the log up to this event and no further, these figures — 1R
 * above all — cannot move once the event is written (ADR-0001).
 */
export interface Plan extends PlanInputs {
  readonly id: string;
  readonly at: string;
  readonly balanceAtCreation: number;
  readonly notional: number;
  /** Cash to post on the exchange. An output of sizing, never an input to it. */
  readonly margin: number;
  /** The dollar Risk this Plan was sized to, and the denominator of every
   *  R-multiple it later produces. Fixed at the original Stop. */
  readonly oneR: number;
  /** Set when the Plan used more Risk than the default in force at the time. */
  readonly aboveDefaultRisk: boolean;
}

export interface DerivedState {
  /** Derived from the Ledger, never stored and never typed. */
  readonly balance: number;
  readonly ledger: readonly LedgerEntry[];
  readonly plans: readonly Plan[];
  /** The Risk a Plan uses unless it says otherwise, as a share of Balance. */
  readonly riskDefault: number;
}

export const emptyState: DerivedState = {
  balance: 0,
  ledger: [],
  plans: [],
  riskDefault: DEFAULT_RISK_FRACTION,
};

/**
 * Folds the whole log into everything the app can show. Pure: same events in,
 * same state out, no clock and no storage.
 */
export function deriveState(events: readonly TradeTrackerEvent[]): DerivedState {
  const ledger: LedgerEntry[] = [];
  const plans: Plan[] = [];
  let balance = 0;
  let riskDefault = DEFAULT_RISK_FRACTION;

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
      case 'PlanCreated': {
        // Deliberately the arithmetic alone. Whether this Plan was *allowed*
        // was settled when it was recorded; re-deciding it here would let a
        // later change of policy — or an overridden Rule — make an already
        // written Plan unreadable, and with it every row in the log.
        const sizing = solveSizing(balance, event);
        if (sizing.outcome !== 'sized') {
          throw new Error(`Stored Plan ${event.id} cannot be sized: ${sizing.reason}`);
        }
        plans.push({
          id: event.id,
          at: event.at,
          direction: event.direction,
          entryPrice: event.entryPrice,
          stopPrice: event.stopPrice,
          leverage: event.leverage,
          liquidationPrice: event.liquidationPrice,
          riskFraction: event.riskFraction,
          balanceAtCreation: balance,
          notional: sizing.notional,
          margin: sizing.margin,
          oneR: sizing.risk,
          aboveDefaultRisk: event.riskFraction > riskDefault,
        });
        break;
      }
      case 'RiskDefaultChanged':
        riskDefault = event.riskFraction;
        break;
      default: {
        // Assigning to never is what makes the switch exhaustive: adding an
        // event type without saying how it moves the Balance is a compile
        // error here, rather than one that silently leaves the Balance
        // unchanged and every figure derived after it plausible and wrong.
        const unhandled: never = event;
        throw new Error(`Event not folded into derived state: ${JSON.stringify(unhandled)}`);
      }
    }
  });

  return { balance, ledger, plans, riskDefault };
}
