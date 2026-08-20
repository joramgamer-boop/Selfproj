import type { AbandonReason } from './plan';
import { captureRateOf, rMultipleOf } from './settlement';
import type { DerivedState, Plan, Trade } from './state';

/**
 * The whole history in one sequence: everything a Plan can have ended as.
 *
 * A Plan still waiting, and a Position still live, are deliberately absent —
 * they are decisions still to be made, and they have their own places on the
 * screen. This is the record of what happened, and it is what gets reviewed.
 */

/** A closed, settled Position, with everything derived about it. */
export interface TradeRow {
  readonly kind: 'Trade';
  /** When it closed. Corrected if the trader corrected it. */
  readonly at: string;
  readonly trade: Trade;
  /** Realized P&L net of fees over the Plan's 1R (ADR-0001). */
  readonly rMultiple: number;
  /** Null when no move was ever available to keep a share of. */
  readonly captureRate: number | null;
}

/**
 * A Plan sized and then not taken. It carries no derived result because there
 * is none: a skip moved no money. It is on the log anyway, because skipping is
 * part of the edge and an absent row is evidence about nothing.
 */
export interface AbandonedPlanRow {
  readonly kind: 'Abandoned Plan';
  /** When it was skipped. */
  readonly at: string;
  readonly plan: Plan;
  /** Why it was skipped. Non-null here, where the Plan's own is not: a row
   *  exists at all only because the Plan carries an abandonment. */
  readonly reason: AbandonReason;
}

export type LogRow = TradeRow | AbandonedPlanRow;

/**
 * Everything that has ended, newest first.
 *
 * Ordered by when each row *ended* rather than by where it sits in the event
 * log, which are the same thing until a Trade is written up late and its close
 * time corrected. That correction is the reason the timestamp is editable at
 * all, and honouring it here is what makes the log read as a history rather
 * than as a list of typing sessions. The Ledger, whose running Balance has to
 * follow the order the money moved, deliberately does the opposite.
 */
export function tradeLog(state: DerivedState): readonly LogRow[] {
  const rows: LogRow[] = [
    ...state.trades.map(
      (trade): TradeRow => ({
        kind: 'Trade',
        at: trade.closedAt,
        trade,
        rMultiple: rMultipleOf(trade),
        captureRate: captureRateOf(trade),
      }),
    ),
    ...state.plans.flatMap((plan): AbandonedPlanRow[] =>
      plan.abandonment === null
        ? []
        : [
            {
              kind: 'Abandoned Plan',
              at: plan.abandonment.at,
              plan,
              reason: plan.abandonment.reason,
            },
          ],
    ),
  ];

  // Compared rather than collated: these are fixed-width ISO instants, where
  // ordering them as plain strings is the ordering of the instants themselves.
  return rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
