import { baseAfterWithdrawal, drawdownOf, isPastTripwire } from './account';
import type {
  EvidenceAttached,
  EvidenceRemoved,
  PlanAbandoned,
  PositionClosed,
  PositionOpened,
  StopMoved,
  TradeTrackerEvent,
} from './events';
import { toCents } from './money';
import type { AbandonReason, PlanInputs } from './plan';
import { DEFAULT_RISK_FRACTION } from './risk';
import type { RuleId, Violation } from './rules';
import { solveSettlement } from './settlement';
import { solveSizing } from './sizing';
import type { ClosingRecord } from './trade';

/** What moved the Balance, in the Ledger's own words rather than the log's. */
export type LedgerKind = 'Deposit' | 'Withdrawal' | 'Trade';

/** One movement of the Balance, in the order it was recorded. */
export interface LedgerEntry {
  /** Position in the event log. Stable because the log is append-only. */
  readonly seq: number;
  readonly kind: LedgerKind;
  readonly at: string;
  /** Signed: credits are positive, so a Withdrawal reads negative. */
  readonly amount: number;
  readonly balanceAfter: number;
  /**
   * The Rules this row broke on its way in, warned about rather than blocked.
   * Empty on everything but a Withdrawal, which is the only entry the Ledger
   * has anything to say about — the rest either could not break a Rule or were
   * stopped before they became a row.
   */
  readonly warnings: readonly RuleId[];
}

/** Where a Plan has got to. Every Plan ends at one of the last two. */
export type PlanStatus = 'planned' | 'open' | 'closed' | 'abandoned';

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
   * The skip, or null while there was not one. One field rather than a reason
   * beside a stamp, so a row that says it was skipped always says when and
   * what for — the accumulating "price ran away" is the whole point of it, and
   * a pair that cannot come apart needs no comment asking that it be kept
   * together.
   *
   * The stamp is separate from `at`, which is when the Plan was sized: the
   * log reads in the order things ended, and a Plan sized in the morning and
   * skipped at night ended at night.
   */
  readonly abandonment: Abandonment | null;
  /**
   * Every Rule overridden anywhere in this Plan's life — sizing it, taking it
   * live — in the order the overrides happened. Unlike the figures above this
   * one grows, because a Plan can break a Rule at each step it takes, and the
   * Trade it closes as carries the lot.
   */
  readonly violations: readonly Violation[];
}

/** A Plan sized and then not taken, and when the trader said so. */
export interface Abandonment {
  readonly at: string;
  readonly reason: AbandonReason;
}

/** One time the Stop was moved while the Position was live. */
export interface StopMove {
  readonly at: string;
  readonly stopPrice: number;
}

/** A Plan that is live on the exchange. It ends by closing into a Trade. */
export interface Position {
  readonly plan: Plan;
  readonly openedAt: string;
  /**
   * Where the Stop stands now — the Plan's own until it was moved. It sits
   * here rather than on the Plan because the Plan's Stop is what the Position
   * was sized at, and 1R is fixed to it (ADR-0001). Two fields, so that
   * tightening a Stop can never be mistaken for resizing the risk.
   */
  readonly stopPrice: number;
  /** Every move, in the order they happened. Empty until the Stop moved. */
  readonly stopMoves: readonly StopMove[];
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
  /**
   * Where the Stop was moved to while the Position was live, in order. Carried
   * onto the Trade rather than left behind with the Position, because how a
   * Trade was managed is exactly what the log is read for — and because a
   * Stop trailed to breakeven is the explanation for an R-multiple that would
   * otherwise look like an unexplained early exit. It changes no figure here:
   * 1R stays fixed to the Plan's original Stop (ADR-0001).
   */
  readonly stopMoves: readonly StopMove[];
  /**
   * The screenshot that stands as proof of this fill, or null where there is
   * none — attaching one is optional, and a Trade without one is a complete
   * Trade. It names a blob in the store rather than holding an image, and
   * nothing anywhere else on this record was read out of it (ADR-0003).
   */
  readonly evidenceId: string | null;
}

export interface DerivedState {
  /** Derived from the Ledger, never stored and never typed. */
  readonly balance: number;
  /**
   * The deposited capital still in the account. Raised by every Deposit and
   * lowered only by a Withdrawal that dug into it — never by a losing Trade,
   * which loses money that was still put in (see `baseAfterWithdrawal`).
   */
  readonly base: number;
  /** The highest Balance the Ledger ever reached. Not Best Price: that is one
   *  Position's high-water mark, this is the account's. */
  readonly peakBalance: number;
  /** The fall from Peak Balance, as a share of it. Zero at a new peak. */
  readonly drawdown: number;
  /**
   * True while the Drawdown is past the tripwire and the log review has not
   * been acknowledged since it last fired. What the Rule that blocks new Plans
   * reads, and what puts the banner on screen.
   */
  readonly drawdownReviewDue: boolean;
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
  base: 0,
  peakBalance: 0,
  drawdown: 0,
  drawdownReviewDue: false,
  ledger: [],
  plans: [],
  openPositions: [],
  trades: [],
  riskDefault: DEFAULT_RISK_FRACTION,
};

/** A Plan being folded, before it is known how the Plan turned out. */
interface PlanRecord {
  readonly figures: Omit<Plan, 'status' | 'violations' | 'abandonment'>;
  status: PlanStatus;
  abandonment: Abandonment | null;
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
  // The screenshot each Trade currently stands on, by Plan id. Unlike a
  // Violation this is not a snapshot of a moment — it is whatever the last
  // attach or removal left — so it is resolved once at the end rather than
  // written onto the Trade as it closes.
  const evidence = new Map<string, string>();
  let balance = 0;
  let base = 0;
  let peakBalance = 0;
  // Whether the tripwire has been answered since it last fired. Reset below
  // rather than cleared by hand, so re-arming is a property of the fold.
  let reviewed = false;
  let riskDefault = DEFAULT_RISK_FRACTION;

  /**
   * Everything that follows the Balance moving. The peak only ever rises, and
   * a Drawdown back inside the tripwire re-arms it: the next fall past the
   * threshold is a new fall, and wants a new look at the log.
   */
  const balanceMoved = () => {
    peakBalance = Math.max(peakBalance, balance);
    if (!isPastTripwire(drawdownOf(balance, peakBalance))) reviewed = false;
  };

  // Copied rather than shared: a Position or Trade holds the Plan as it stood
  // when it was taken, and a Violation recorded later must not appear on it.
  const asPlan = (record: PlanRecord): Plan => ({
    ...record.figures,
    status: record.status,
    abandonment: record.abandonment,
    violations: [...record.violations],
  });

  events.forEach((event, seq) => {
    switch (event.type) {
      case 'Deposit':
        balance = toCents(balance + event.amount);
        base = toCents(base + event.amount);
        balanceMoved();
        ledger.push({
          seq,
          kind: 'Deposit',
          at: event.at,
          amount: event.amount,
          balanceAfter: balance,
          warnings: [],
        });
        break;
      case 'Withdrawal':
        balance = toCents(balance - event.amount);
        // By exactly what the Withdrawal dug out of it and no more: taking
        // profit leaves the base where it was, and taking more than profit
        // leaves the base short by the part that was not profit.
        base = baseAfterWithdrawal(base, event.amount, balance);
        balanceMoved();
        ledger.push({
          seq,
          kind: 'Withdrawal',
          at: event.at,
          // Negative, so the Ledger's amounts sum to the Balance folded above
          // them and a row never has to be read twice to know which way it went.
          amount: toCents(-event.amount),
          balanceAfter: balance,
          // Recorded, never re-judged — exactly as a Violation is. Whether this
          // Withdrawal would warn against today's Balance is beside the point:
          // it warned then, and the row is what the trader saw.
          warnings: event.warnings,
        });
        break;
      case 'DrawdownReviewAcknowledged':
        reviewed = true;
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
          abandonment: null,
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
      case 'PlanAbandoned': {
        const record = planOf(records, event);
        // Only a Plan can be skipped. A skip against one already live or
        // already closed is not an ambiguity to report, it is a log that
        // contradicts itself — and folding it would leave a Position running
        // under a row that says it was never taken.
        if (record.status !== 'planned') {
          throw new Error(
            `Stored abandonment of ${event.planId} refers to a Plan that was already ${record.status}.`,
          );
        }
        record.status = 'abandoned';
        record.abandonment = { at: event.at, reason: event.reason };
        // No Ledger entry and no Trade, deliberately: a Plan that was never
        // taken moved no money, and letting it near either would put a
        // non-event into the Balance and into every statistic folded from
        // the Trades.
        break;
      }
      case 'PositionOpened': {
        const record = planOf(records, event);
        record.status = 'open';
        record.violations.push(...event.violations);
        open.set(event.planId, {
          plan: asPlan(record),
          openedAt: event.at,
          // Where the Plan put it. A Position that never moves its Stop reads
          // the same as the Plan it was sized as, which is the point.
          stopPrice: record.figures.stopPrice,
          stopMoves: [],
        });
        break;
      }
      case 'StopMoved': {
        const record = planOf(records, event);
        const position = open.get(event.planId);
        if (!position) {
          throw new Error(`Stored Stop move on ${event.planId} has no Position open to move it on.`);
        }
        record.violations.push(...event.violations);

        // Everything about the Plan is left where it was: only where the Stop
        // stands changes, and the moves accumulate beside it.
        open.set(event.planId, {
          ...position,
          plan: asPlan(record),
          stopPrice: event.stopPrice,
          stopMoves: [...position.stopMoves, { at: event.at, stopPrice: event.stopPrice }],
        });
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
        // The base is deliberately left alone. Money lost trading is still
        // money that was put in, and forgiving the base on the way down would
        // let a recovery back to it read as profit — so the Withdrawal that
        // followed would take the base out with nothing said about it.
        balanceMoved();
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
          // Taken off the Position as it closes, since that is the last moment
          // the moves exist anywhere: the Position itself is about to go.
          stopMoves: position.stopMoves,
          // Filled in at the end of the fold: a screenshot may be attached
          // long after the close, and taken off again after that.
          evidenceId: null,
        });
        ledger.push({
          seq,
          kind: 'Trade',
          warnings: [],
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
      case 'EvidenceAttached': {
        // Evidence is proof of a fill, so there has to have been one. A
        // screenshot folded against a Plan that never closed would reach no
        // Trade and simply vanish, leaving a stored image nothing on screen
        // can ever reach.
        requireClosed(records, event);
        evidence.set(event.planId, event.evidenceId);
        break;
      }
      case 'EvidenceRemoved': {
        requireClosed(records, event);
        // Deliberately not an error when there was nothing to remove: it
        // contradicts nothing and folds to the right answer either way.
        evidence.delete(event.planId);
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

  const drawdown = drawdownOf(balance, peakBalance);

  return {
    balance,
    base,
    peakBalance,
    drawdown,
    drawdownReviewDue: isPastTripwire(drawdown) && !reviewed,
    ledger,
    plans: [...records.values()].map(asPlan),
    openPositions: [...open.values()],
    trades: trades.map((trade) => ({
      ...trade,
      evidenceId: evidence.get(trade.plan.id) ?? null,
    })),
    riskDefault,
  };
}

/**
 * The Plans still waiting on a decision — take it, or say why not.
 *
 * The complement of the Trade log: everything else has either ended, and is on
 * the log, or is live, and has the Position panel. Between the two, nothing a
 * Plan can be is on the screen twice.
 */
export function plansAwaitingADecision(state: DerivedState): readonly Plan[] {
  return state.plans.filter((plan) => plan.status === 'planned');
}

/**
 * The Plan behind an Evidence event, insisting it has closed as a Trade.
 * Evidence hangs off the Trade, which is the only thing a fill can be proof of.
 */
function requireClosed(
  records: Map<string, PlanRecord>,
  event: EvidenceAttached | EvidenceRemoved,
): void {
  const record = planOf(records, event);
  if (record.status !== 'closed') {
    throw new Error(
      `Stored ${event.type} refers to ${event.planId}, a Plan that has not closed as a Trade.`,
    );
  }
}

function planOf(
  records: Map<string, PlanRecord>,
  event:
    | PlanAbandoned
    | PositionOpened
    | StopMoved
    | PositionClosed
    | EvidenceAttached
    | EvidenceRemoved,
): PlanRecord {
  const record = records.get(event.planId);
  if (!record) {
    throw new Error(`Stored ${event.type} refers to a Plan not on the record: ${event.planId}`);
  }
  return record;
}
