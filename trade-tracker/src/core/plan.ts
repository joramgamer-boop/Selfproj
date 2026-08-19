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

/**
 * Why a Plan was sized and then not taken. A fixed list rather than free text
 * for the same reason the Exit Reasons are one: a skip is data about the edge,
 * and prose cannot be counted. "Price ran away" above all — it is entry lag,
 * and it only reads as a leak once it has accumulated somewhere visible.
 */
export const ABANDON_REASONS = [
  'no valid stop',
  'risk too large to size',
  'price ran away',
  'changed my mind',
] as const;

export type AbandonReason = (typeof ABANDON_REASONS)[number];

export function isAbandonReason(value: string): value is AbandonReason {
  return (ABANDON_REASONS as readonly string[]).includes(value);
}
