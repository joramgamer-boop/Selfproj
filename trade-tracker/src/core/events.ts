import type { PlanInputs } from './plan';
import type { Violation } from './rules';
import type { ClosingRecord } from './trade';

/**
 * The append-only log. Every figure the app shows — Balance today, 1R and
 * Expectancy later — is derived by folding these events, never stored.
 */

/** Money moved into the account. Not trading return. */
export interface Deposit {
  readonly type: 'Deposit';
  /** ISO-8601, stamped from the injected clock when the command was recorded. */
  readonly at: string;
  /** Positive, in account currency. */
  readonly amount: number;
}

/**
 * A sized intention to trade. It holds only what the trader typed: Notional,
 * Margin and 1R are solved by folding it against the Balance standing at this
 * point in the log. That is what makes 1R fixed at the original Stop by
 * construction rather than by discipline (ADR-0001) — nothing appended later
 * can reach back and change the figures this event folds to.
 */
export interface PlanCreated extends PlanInputs {
  readonly type: 'PlanCreated';
  readonly at: string;
  readonly id: string;
  /**
   * One per Rule overridden to create this Plan, each carrying the reason
   * typed at the time; empty when the Plan broke none. A Violation becomes
   * permanent here, written into the log beside the Plan it belongs to, so
   * nothing appended later can separate the two.
   */
  readonly violations: readonly Violation[];
}

/** A settings change, kept in the log so the default has a history. */
export interface RiskDefaultChanged {
  readonly type: 'RiskDefaultChanged';
  readonly at: string;
  readonly riskFraction: number;
}

/** A Plan taken live on the exchange. One action, and nothing to type. */
export interface PositionOpened {
  readonly type: 'PositionOpened';
  readonly at: string;
  readonly planId: string;
  /** One per Rule overridden to take this Plan live — opening while another
   *  Position is already running, above all. */
  readonly violations: readonly Violation[];
}

/**
 * A Position closed and settled — the event that produces a Trade and moves
 * the Balance. It holds what the trader typed and nothing solved: P&L, the
 * R-multiple and Capture Rate are all folded back out of it against the Plan.
 */
export interface PositionClosed extends ClosingRecord {
  readonly type: 'PositionClosed';
  /** ISO-8601, stamped from the injected clock when the close was recorded. */
  readonly at: string;
  readonly planId: string;
  /**
   * When the hold actually began and ended. These are the stamps unless the
   * trader corrected them — logging a close two hours late must not fabricate
   * a two-hour hold — and the fold marks a correction as edited by comparing
   * them against the stamps, so an edit cannot be recorded as anything else.
   */
  readonly openedAt: string;
  readonly closedAt: string;
}

export type TradeTrackerEvent =
  | Deposit
  | PlanCreated
  | PositionOpened
  | PositionClosed
  | RiskDefaultChanged;

export type TradeTrackerEventType = TradeTrackerEvent['type'];
