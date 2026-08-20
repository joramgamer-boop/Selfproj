import { drawdownPercent } from './core/account';
import type { AbandonReason, Direction } from './core/plan';
import { riskPercentOf } from './core/risk';
import type { ExitReason } from './core/trade';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const when = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export function formatMoney(amount: number): string {
  return money.format(amount);
}

export function formatWhen(isoTimestamp: string): string {
  return when.format(new Date(isoTimestamp));
}

const directions: Record<Direction, string> = { long: 'Long', short: 'Short' };

/** Which way round the trade is, as every screen says it. */
export function formatDirection(direction: Direction): string {
  return directions[direction];
}

const abandonReasons: Record<AbandonReason, string> = {
  'no valid stop': 'No valid Stop',
  'risk too large to size': 'Risk too large to size',
  'price ran away': 'Price ran away',
  'changed my mind': 'Changed my mind',
};

/**
 * Why a Plan was skipped, as every screen says it. One spelling, so the button
 * that records a skip and the row that reports it cannot drift apart.
 */
export function formatAbandonReason(reason: AbandonReason): string {
  return abandonReasons[reason];
}

const exitReasons: Record<ExitReason, string> = {
  'stop hit': 'Stop hit',
  'manual exit in profit': 'Manual exit in profit',
  'manual exit at a loss': 'Manual exit at a loss',
  'take-profit hit': 'Take-profit hit',
  liquidated: 'Liquidated',
};

/**
 * How a Position ended, as every screen says it. Shared with the abandon
 * reasons above for the same reason: the list the close is picked from and the
 * row that reports it must not come to spell it differently.
 */
export function formatExitReason(reason: ExitReason): string {
  return exitReasons[reason];
}

/**
 * A distance between two prices. Printed as a price rather than as money — a
 * coin quoted at 0.00001234 would round to $0.00 — but rounded to twelve
 * significant figures first, which is more than any exchange quotes and just
 * few enough to drop what a subtraction leaves behind: 114 − 100.1 is 13.9,
 * not 13.899999999999999.
 */
export function formatPriceDistance(distance: number): string {
  return String(Number(distance.toPrecision(12)));
}

const rMultiple = new Intl.NumberFormat('en-US', {
  // Signed, except at zero. A log skimmed on a phone is read by the sign
  // before it is read by the number, and a bare "1.00R" beside a "-1.00R" is
  // ambiguous at exactly the speed the log is actually reviewed at — but a
  // Stop trailed to entry and hit there is the 0R that ADR-0001 keeps the
  // denominator fixed to report, and "+0.00R" would file it under wins.
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** What a Trade came to, in the unit every result in the log is compared in. */
export function formatR(multiple: number): string {
  return `${rMultiple.format(multiple)}R`;
}

const captureRate = new Intl.NumberFormat('en-US', {
  style: 'percent',
  // Whole percent. The share of a move that was kept is a coarse behavioural
  // measure — the source notes talk in 55% against 70% — and a tenth here
  // would be precision the Best Price it divides by does not have.
  maximumFractionDigits: 0,
});

/**
 * The share of the available move a Trade kept. An em dash where there is no
 * answer: a Trade the price never moved favourably on has no share to report,
 * and "0%" would read as a verdict on how it was managed.
 */
export function formatCaptureRate(rate: number | null): string {
  return rate === null ? '—' : captureRate.format(rate);
}

/**
 * Drawdown as the account screen says it: a percentage of Peak Balance, to one
 * decimal. The tenth matters — the difference between 19.9% and 20.0% is the
 * difference between planning a trade and reading the log first.
 */
export function formatDrawdown(fraction: number): string {
  return `${drawdownPercent(fraction).toFixed(1)}%`;
}

/** Risk as the Plan screen says it: a percentage of Balance, to one decimal. */
export function formatRiskPercent(fraction: number): string {
  return `${riskPercentOf(fraction).toFixed(1)}%`;
}

/**
 * An instant as a <input type="datetime-local"> holds it: local time, to the
 * minute. Timestamps are shown and corrected in the trader's own timezone, and
 * stored in the log as UTC.
 */
export function toDateTimeInput(instant: string | Date): string {
  const local = new Date(instant);
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
  return `${day}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

/**
 * Back to an instant the log can hold. What cannot be read as a time is passed
 * through untouched, because whether a correction is recordable is the core's
 * to say, not this module's.
 */
export function fromDateTimeInput(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
