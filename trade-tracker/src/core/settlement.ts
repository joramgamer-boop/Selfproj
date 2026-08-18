import { toCents } from './money';
import type { Plan } from './state';
import { isExitReason, type ClosingRecord, type ProposedClose } from './trade';

export interface Settlement {
  /** The move, before the exchange took its cut. */
  readonly grossPnl: number;
  readonly fees: number;
  /** What actually moved the Balance: gross less fees. Negative on a loser. */
  readonly realizedPnl: number;
}

export type Close =
  | { readonly outcome: 'recordable'; readonly closing: ClosingRecord }
  | { readonly outcome: 'unrecordable'; readonly reason: string };

/**
 * The arithmetic, and only the arithmetic — this always answers, because a
 * Trade that has already happened has a P&L whatever the record around it
 * looks like. The fold uses it for that reason; `closeOut` below is the gate a
 * close must pass *before* it is written down.
 */
export function solveSettlement(plan: Plan, closing: ClosingRecord): Settlement {
  // The size the Plan bought, in units of the thing traded. Taken from the
  // Plan rather than from the fill, so a fill away from the planned entry
  // costs captured move — it does not quietly resize the risk that was
  // committed (ADR-0001).
  const size = plan.notional / plan.entryPrice;
  const move =
    plan.direction === 'long'
      ? closing.exitPrice - closing.entryPrice
      : closing.entryPrice - closing.exitPrice;

  const grossPnl = toCents(size * move);
  const fees = toCents(closing.fees);

  return { grossPnl, fees, realizedPnl: toCents(grossPnl - fees) };
}

/**
 * The record a Trade must be complete enough to keep, or the reason it is not.
 * Everything here is required — Best Price and fees above all, because the two
 * questions this log exists to answer are what share of the move was kept and
 * whether the edge survives fees.
 */
export function closeOut(plan: Plan, proposed: ProposedClose): Close {
  const refusal = whatIsMissing(plan, proposed);
  if (refusal) return { outcome: 'unrecordable', reason: refusal };

  // Narrowed here rather than in the checks below, so that what comes back is
  // a record the rest of the app can trust without asking again.
  const { exitReason } = proposed;
  if (!isExitReason(exitReason)) return { outcome: 'unrecordable', reason: 'Pick an Exit Reason.' };

  return {
    outcome: 'recordable',
    closing: {
      entryPrice: proposed.entryPrice,
      exitPrice: proposed.exitPrice,
      bestPrice: proposed.bestPrice,
      // To the cent, so the Ledger entry folded from it adds up.
      fees: toCents(proposed.fees),
      exitReason,
      scaledIn: proposed.scaledIn,
      scaledOut: proposed.scaledOut,
      notes: proposed.notes.trim(),
    },
  };
}

function whatIsMissing(plan: Plan, proposed: ProposedClose): string | null {
  if (!isPrice(proposed.entryPrice)) return 'Entry price must be above zero.';
  if (!isPrice(proposed.exitPrice)) return 'Exit price must be above zero.';
  if (!isPrice(proposed.bestPrice)) {
    return 'Best Price is required on every Trade, winners and losers alike.';
  }
  if (!Number.isFinite(proposed.fees)) return 'Record the fees, even if they were zero.';
  if (proposed.fees < 0) return 'Fees cannot be negative.';

  return wrongSideBestPrice(plan, proposed);
}

/**
 * A Best Price the wrong side of the entry or the exit is not a bad trade, it
 * is an impossible one: the price stood at the entry the moment the Position
 * opened and at the exit the moment it closed. Storing one would make Capture
 * Rate — the whole reason the field is required — report nonsense.
 */
function wrongSideBestPrice(plan: Plan, proposed: ProposedClose): string | null {
  const { bestPrice, entryPrice, exitPrice } = proposed;
  if (plan.direction === 'long' && bestPrice < Math.max(entryPrice, exitPrice)) {
    return 'Best Price is the highest the price reached — on a long it cannot sit below the entry or the exit.';
  }
  if (plan.direction === 'short' && bestPrice > Math.min(entryPrice, exitPrice)) {
    return 'Best Price is the lowest the price reached — on a short it cannot sit above the entry or the exit.';
  }
  return null;
}

function isPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
