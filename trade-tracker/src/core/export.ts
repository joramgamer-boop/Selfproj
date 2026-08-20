import type { DerivedState } from './state';

/**
 * Taking a copy of the log out of the app, and the Rule that insists on it.
 *
 * Two formats, and they are deliberately not two spellings of one thing:
 *
 * - **`csv`** is one row per closed Trade for a spreadsheet or the future
 *   analyzer. It is a *reading* of the log — flat, derived, and lossy on
 *   purpose.
 * - **`json`** is the whole event log with the Evidence beside it: the only
 *   copy the app can restore from, and so the only one that is a Backup.
 */
export const EXPORT_FORMATS = ['csv', 'json'] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * How many Trades may close between Backups before new Plans stop.
 *
 * The number is not the point; the enforcement is. Browser storage is
 * deletable, and a log that vanishes at Trade 40 destroys the whole exercise —
 * so backing up is a Rule like any other rather than a habit, and like any
 * other it can be overridden by typing why.
 *
 * Ten, because that is roughly a month of trading at the source notes' pace:
 * long enough that the nag is not constant, short enough that losing the phone
 * costs a fortnight of Trades rather than the whole record.
 */
export const UNBACKED_TRADE_LIMIT = 10;

/**
 * Whether the log is overdue a Backup. Folded into derived state beside the
 * Drawdown tripwire and read from there by both the Rule and the screen, so
 * the panel that nags and the block that stops a Plan cannot come to disagree
 * about when it is due.
 */
export function isBackupDue(tradesSinceBackup: number): boolean {
  return tradesSinceBackup >= UNBACKED_TRADE_LIMIT;
}

/**
 * Why there is no file to make, or null when there is one.
 *
 * Not a Rule: there is nothing to override and nothing to record, because
 * nothing happened. It is the same kind of refusal as removing a screenshot
 * that is not there — and it lives here, in the core, for the same reason
 * every other refusal does: a screen renders the reason, it never decides one.
 */
export function nothingToExport(state: DerivedState, format: ExportFormat): string | null {
  if (format === 'csv') {
    // A file of headers alone would sit in the trader's files looking like a
    // record of a month's trading and hold nothing at all.
    return state.trades.length === 0 ? 'No Trade has closed yet, so there is nothing to export.' : null;
  }

  return state.ledger.length === 0 && state.plans.length === 0
    ? 'There is nothing recorded on this device to back up.'
    : null;
}
