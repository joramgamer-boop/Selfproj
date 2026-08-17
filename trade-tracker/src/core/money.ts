/**
 * Money is carried as a plain number of account currency. Sums are rounded to
 * cents at the point they become a derived figure, so a Balance folded from a
 * long Ledger never drifts into 749.9999999999999 and then into a Position size
 * solved from it.
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function isRecordableAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}
