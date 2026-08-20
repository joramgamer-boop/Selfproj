import { toCents } from './money';

/**
 * The account as a whole, as against any one trade: the capital that was put
 * into it, the high-water mark the Balance reached, and how far below that it
 * sits now.
 */

/**
 * The fall from Peak Balance at which the tripwire fires and new Plans stop
 * until the log has been reviewed.
 *
 * Not an emergency threshold. The source notes' simulations put the average
 * peak-to-trough at around 42% over two months even at 2% Risk, so a 20%
 * Drawdown is an ordinary part of a run that ends up profitable — it is simply
 * the point at which the log is still short enough to read, and the point the
 * notes identify as where discipline actually breaks.
 */
export const DRAWDOWN_TRIPWIRE = 0.2;

/**
 * The fall from Peak Balance, as a share of it. Zero at a new peak and never
 * negative: a Balance above the peak *is* the peak.
 *
 * Carried to four decimal places for the same reason a Risk fraction is. A
 * Drawdown folded from a long Ledger otherwise lands on 0.19999999999999998,
 * and a tripwire set at a fifth would read that as clear.
 */
export function drawdownOf(balance: number, peakBalance: number): number {
  if (peakBalance <= 0) return 0;
  const fallen = (peakBalance - balance) / peakBalance;
  return fallen <= 0 ? 0 : Math.round(fallen * 10_000) / 10_000;
}

/**
 * Drawdown as every screen and every Rule says it: a percentage, to a tenth.
 * One definition, because that tenth is load-bearing — the difference between
 * 19.9% and 20.0% is the difference between planning a trade and reading the
 * log first, and a Rule that rounded differently from the banner above it
 * would be arguing with the screen.
 */
export function drawdownPercent(drawdown: number): number {
  return Math.round(drawdown * 1000) / 10;
}

export function isPastTripwire(drawdown: number): boolean {
  return drawdown >= DRAWDOWN_TRIPWIRE;
}

/**
 * The base left after a Withdrawal of `amount` took the Balance to
 * `balanceAfter`. Deposits raise the base; nothing lowers it but a Withdrawal
 * digging into it, and then by exactly how much it dug and no more.
 *
 * How much that is, is the whole of this function. Above the base, a
 * Withdrawal comes out of profit and the base does not move. Below it, every
 * dollar taken is a dollar of base — but only the dollars actually taken.
 *
 * The distinction matters most on an account already under water from losing
 * Trades, where the two readings differ by everything. Taking the Balance as
 * the new base there would forgive the whole loss: an account that deposited
 * 1000, traded down to 500 and withdrew 10 would carry a base of 490, and its
 * recovery back to 1000 would then read as having doubled. So a losing Trade
 * never touches the base, and a Withdrawal moves it only by its own size.
 */
export function baseAfterWithdrawal(
  base: number,
  amount: number,
  balanceAfter: number,
): number {
  const dugIntoBase = Math.min(amount, Math.max(0, base - balanceAfter));
  return toCents(base - dugIntoBase);
}

/**
 * Whether the account has doubled its base: the framework's precondition for
 * taking anything out at all. An account with no base has not doubled it —
 * there is nothing there that could have.
 */
export function hasDoubled(balance: number, base: number): boolean {
  return base > 0 && balance >= base * 2;
}
