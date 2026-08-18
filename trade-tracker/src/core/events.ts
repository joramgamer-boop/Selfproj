import type { PlanInputs } from './plan';

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
}

/** A settings change, kept in the log so the default has a history. */
export interface RiskDefaultChanged {
  readonly type: 'RiskDefaultChanged';
  readonly at: string;
  readonly riskFraction: number;
}

export type TradeTrackerEvent = Deposit | PlanCreated | RiskDefaultChanged;

export type TradeTrackerEventType = TradeTrackerEvent['type'];
