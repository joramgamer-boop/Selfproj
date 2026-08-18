/**
 * What a Position ended as. A fixed list rather than free text because prices
 * alone cannot tell an early exit apart from a round-trip, and prose cannot be
 * counted.
 */
export const EXIT_REASONS = [
  'stop hit',
  'manual exit in profit',
  'manual exit at a loss',
  'take-profit hit',
  'liquidated',
] as const;

export type ExitReason = (typeof EXIT_REASONS)[number];

export function isExitReason(value: string): value is ExitReason {
  return (EXIT_REASONS as readonly string[]).includes(value);
}

/**
 * What the trader types when a Position closes, and the only Trade data the
 * log stores. P&L is absent by design: it is solved from these against the
 * Plan that was sized, never typed.
 *
 * Entry sits here rather than on the open, because a scaled entry is only
 * known once the last fill is in — and a Trade has exactly one entry price
 * either way: the weighted average, flagged as scaled.
 */
export interface ClosingRecord {
  /** The weighted average of the entry fills. The Plan's entry unless it moved. */
  readonly entryPrice: number;
  /** The weighted average of the exit fills. */
  readonly exitPrice: number;
  /** The most favourable price reached while open. Required on every Trade. */
  readonly bestPrice: number;
  /** Charged by the exchange. Kept apart from P&L so fee drag stays visible. */
  readonly fees: number;
  readonly exitReason: ExitReason;
  readonly scaledIn: boolean;
  readonly scaledOut: boolean;
  /** Free text. Where a behavioural leak gets written down. */
  readonly notes: string;
}

/**
 * A close as the screen offers it: the same record, before the Exit Reason has
 * been checked against the list. The screen sends what was picked; deciding
 * whether it is one of the five is the job of the core.
 */
export interface ProposedClose extends Omit<ClosingRecord, 'exitReason'> {
  readonly exitReason: string;
}
