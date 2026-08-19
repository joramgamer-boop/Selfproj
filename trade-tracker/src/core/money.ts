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

/**
 * Whether a figure names a price at all. One definition, because every module
 * that reads one asks the same question of it — and a blank number field
 * arrives as zero, which is not a price but the absence of one.
 */
export function isPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
