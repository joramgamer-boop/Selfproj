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

export type TradeTrackerEvent = Deposit;

export type TradeTrackerEventType = TradeTrackerEvent['type'];
