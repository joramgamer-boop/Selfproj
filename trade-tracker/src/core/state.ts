import type { PositionClosed, PositionOpened, TradeTrackerEvent } from './events';
import { toCents } from './money';
import type { PlanInputs } from './plan';
import { DEFAULT_RISK_FRACTION } from './risk';
import type { Violation } from './rules';
import { solveSettlement } from './settlement';
import { solveSizing } from './sizing';
import type { ClosingRecord } from './trade';

/** What moved the Balance, in the Ledger's own words rather than the log's. */
export type LedgerKind = 'Deposit' | 'Trade';

/** One movement of the Balance, in the order it was recorded. */
export interface LedgerEntry {
  /** Position in the event log. Stable because the log is append-only. */
  readonly seq: number;
  readonly kind: LedgerKind;
  readonly at: string;
  /** Signed: credits are positive. */
  readonly amount: number;
  readonly balanceAfter: number;
}

/** Where a Plan has got to. A Plan that was sized and skipped joins this later. */
export type PlanStatus = 'planned' | 'open' | 'closed';

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
  readonly status: PlanStatus;
  /**
   * Every Rule overridden anywhere in this Plan's life — sizing it, taking it
   * live — in the order the overrides happened. Unlike the figures above this
   * one grows, because a Plan can break a Rule at each step it takes, and the
   * Trade it closes as carries the lot.
   */
  readonly violations: readonly Violation[];
}

/** A Plan that is live on the exchange. It ends by closing into a Trade. */
export interface Position {
  readonly plan: Plan;
  readonly openedAt: string;
}

/**
 * A closed, settled Position: the permanent record, and the only thing that
 * counts toward Expectancy. Exactly one entry price and one exit price — a
 * scaled entry or exit is its weighted average with a flag, never two Trades.
 */
export interface Trade extends ClosingRecord {
  readonly plan: Plan;
  readonly openedAt: string;
  /** Set when the trader corrected the stamp rather than accepting it. */
  readonly openedAtEdited: boolean;
  readonly closedAt: string;
  readonly closedAtEdited: boolean;
  readonly grossPnl: number;
  /** Net of fees. This, and only this, is what moved the Balance. */
  readonly realizedPnl: number;
}

export interface DerivedState {
  /** Derived from the Ledger, never stored and never typed. */
  readonly balance: number;
  readonly ledger: readonly LedgerEntry[];
  readonly plans: readonly Plan[];
  /**
   * The Positions live on the exchange. A list, though the framework allows
   * exactly one: a Rule that can be overridden (ticket 05) can put a second
   * one in the log, and the job of the fold is to report the log rather than
   * to argue with it.
   */
  readonly openPositions: readonly Position[];
  readonly trades: readonly Trade[];
  /** The Risk a Plan uses unless it says otherwise, as a share of Balance. */
  readonly riskDefault: number;
}

export const emptyState: DerivedState = {
  balance: 0,
  ledger: [],
  plans: [],
  openPositions: [],
  trades: [],
  riskDefault: DEFAULT_RISK_FRACTION,
};

/** A Plan being folded, before it is known how the Plan turned out. */
interface PlanRecord {
  readonly figures: Omit<Plan, 'status' | 'violations'>;
  status: PlanStatus;
  /** Appended to as the log goes on, so a snapshot taken at the close holds
   *  the Violations from every step, not only from sizing. */
  readonly violations: Violation[];
}

/**
 * Folds the whole log into everything the app can show. Pure: same events in,
 * same state out, no clock and no storage.
 */
export function deriveState(events: readonly TradeTrackerEvent[]): DerivedState {
  const ledger: LedgerEntry[] = [];
  // Keyed by Plan id and iterated in insertion order, so a Position and the
  // Trade it becomes can find the Plan they were sized as.
  const records = new Map<string, PlanRecord>();
  const open = new Map<string, Position>();
  const trades: Trade[] = [];
  let balance = 0;
  let riskDefault = DEFAULT_RISK_FRACTION;

  // Copied rather than shared: a Position or Trade holds the Plan as it stood
  // when it was taken, and a Violation recorded later must not appear on it.
  const asPlan = (record: PlanRecord): Plan => ({
    ...record.figures,
    status: record.status,
    violations: [...record.violations],
  });

  events.forEach((event, seq) => {
    switch (event.type) {
      case 'Deposit':
        balance = toCents(balance + event.amount);
        ledger.push({
          seq,
          kind: 'Deposit',
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
        records.set(event.id, {
          status: 'planned',
          // Recorded, never re-judged: whether these Rules would still block
          // this Plan today is beside the point — they blocked it then, and
          // the trader said why.
          violations: [...event.violations],
          figures: {
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
          },
        });
        break;
      }
      case 'PositionOpened': {
        const record = planOf(records, event);
        record.status = 'open';
        record.violations.push(...event.violations);
        open.set(event.planId, { plan: asPlan(record), openedAt: event.at });
        break;
      }
      case 'PositionClosed': {
        const record = planOf(records, event);
        const position = open.get(event.planId);
        if (!position) {
          throw new Error(`Stored close of ${event.planId} has no Position open to close.`);
        }
        record.status = 'closed';
        open.delete(event.planId);

        // The same arithmetic and only the arithmetic, for the same reason the
        // Plan above is not re-adjudicated: this Trade already happened.
        const settlement = solveSettlement(position.plan, event);
        balance = toCents(balance + settlement.realizedPnl);
        trades.push({
          plan: asPlan(record),
          openedAt: event.openedAt,
          // An edit is a difference from what the clock said, so it can be
          // neither claimed nor forgotten apart from the correction itself.
          openedAtEdited: event.openedAt !== position.openedAt,
          closedAt: event.closedAt,
          closedAtEdited: event.closedAt !== event.at,
          entryPrice: event.entryPrice,
          exitPrice: event.exitPrice,
          bestPrice: event.bestPrice,
          fees: settlement.fees,
          exitReason: event.exitReason,
          scaledIn: event.scaledIn,
          scaledOut: event.scaledOut,
          notes: event.notes,
          grossPnl: settlement.grossPnl,
          realizedPnl: settlement.realizedPnl,
        });
        ledger.push({
          seq,
          kind: 'Trade',
          // When the money moved, not when it was written down. The running
          // Balance still follows the order of the log, because that is the
          // order it was folded in — so a Trade logged late reads as a row
          // whose time sits behind the row above it. That is the honest way
          // round: the alternative is a running Balance that never happened.
          at: event.closedAt,
          amount: settlement.realizedPnl,
          balanceAfter: balance,
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

  return {
    balance,
    ledger,
    plans: [...records.values()].map(asPlan),
    openPositions: [...open.values()],
    trades,
    riskDefault,
  };
}

function planOf(
  records: Map<string, PlanRecord>,
  event: PositionOpened | PositionClosed,
): PlanRecord {
  const record = records.get(event.planId);
  if (!record) {
    throw new Error(`Stored ${event.type} refers to a Plan not on the record: ${event.planId}`);
  }
  return record;
}
