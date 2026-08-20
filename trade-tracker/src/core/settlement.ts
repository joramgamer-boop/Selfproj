import { isPrice, toCents } from './money';
import type { Direction } from './plan';
import type { Plan, Trade } from './state';
import { isExitReason, type ClosingRecord, type ProposedClose } from './trade';

export interface Settlement {
  /** The move, before the exchange took its cut. */
  readonly grossPnl: number;
  readonly fees: number;
  /** What actually moved the Balance: gross less fees. Negative on a loser. */
  readonly realizedPnl: number;
}

/**
 * How far the price moved in the direction the trade was taken: forward on a
 * long, backward on a short. One place that knows which way is up, because a
 * sign flipped in one figure and not another would report a losing short as a
 * winner and still add up.
 */
function favourably(direction: Direction, from: number, to: number): number {
  return direction === 'long' ? to - from : from - to;
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
  const move = favourably(plan.direction, closing.entryPrice, closing.exitPrice);

  const grossPnl = toCents(size * move);
  const fees = toCents(closing.fees);

  return { grossPnl, fees, realizedPnl: toCents(grossPnl - fees) };
}

/**
 * What the Trade came to, in units of the Risk it was taken with: realized
 * P&L net of fees over the Plan's 1R. The unit every result in the log is
 * compared in.
 *
 * The denominator is the Plan's — fixed at the Stop it was sized to, whatever
 * the Stop did afterwards (ADR-0001). A Trade that trailed its Stop to
 * breakeven and stopped out there reads as the 0R it was, rather than as a
 * division by a risk that had stopped existing.
 */
export function rMultipleOf(trade: Trade): number {
  // Unrounded, unlike every money figure here. Expectancy is an average of
  // these, and averaging figures already rounded for a screen would bake the
  // display's precision into the one statistic that decides whether the
  // account grows. Rounding belongs where it is rendered.
  return trade.realizedPnl / trade.plan.oneR;
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

/**
 * Of the move that was on offer while the Position was open, the share the
 * Trade actually kept: `(exit − entry) ÷ (Best Price − entry)`, in whichever
 * direction the Trade was taken. The one lever the source notes identify as
 * raising returns and lowering drawdown at the same time.
 *
 * Measured from the entry actually filled rather than the one planned, for the
 * same reason the P&L is: entry lag is a leak, and it belongs to the Trade
 * rather than to the Plan that preceded it.
 *
 * A loser reads negative, because the move it kept was backwards. That is why
 * Best Price is required on losers as well as winners — without it a
 * round-trip, which is a −1R with a distant Best Price, could not be told
 * apart from a trade that never worked at all.
 */
export function captureRateOf(trade: Trade): number | null {
  const available = availableMoveOf(trade);
  // No move was ever available, so there is no share of one to report. Zero
  // would be a verdict on how the Trade was managed, and there is none to give.
  if (available <= 0) return null;

  const kept = favourably(trade.plan.direction, trade.entryPrice, trade.exitPrice);

  // Unrounded, exactly as the R-multiple above is, and for the same reason.
  return kept / available;
}

/**
 * The move that was on offer while the Position was open: from the entry
 * actually filled to the Best Price. The denominator of the Capture Rate, and
 * worth reading on its own — it is what separates a round-trip, which handed
 * back a large available move, from a trade that never worked at all.
 */
export function availableMoveOf(trade: Trade): number {
  return favourably(trade.plan.direction, trade.entryPrice, trade.bestPrice);
}
