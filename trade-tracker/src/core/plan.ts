export type Direction = 'long' | 'short';

/**
 * What the trader types to define a Plan, and the only Plan data the log ever
 * stores. Notional, Margin and 1R are absent by design: they are solved from
 * these against the Balance of the moment, never typed and never written down.
 *
 * This lives in its own module so that the log's own types do not have to
 * depend on the sizing module to describe a Plan.
 */
export interface PlanInputs {
  readonly direction: Direction;
  readonly entryPrice: number;
  readonly stopPrice: number;
  readonly leverage: number;
  /** The figure the exchange reports — never one this project calculates. */
  readonly liquidationPrice: number;
  /** Share of Balance risked, e.g. 0.02. Not a dollar amount: Balance moves. */
  readonly riskFraction: number;
}
