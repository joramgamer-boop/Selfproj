import type { AbandonReason, Direction } from './core/plan';
import { riskPercentOf } from './core/risk';

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
