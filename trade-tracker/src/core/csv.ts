import { tradeLog, type TradeRow } from './log';
import type { DerivedState } from './state';

/**
 * The closed Trades as a spreadsheet reads them: one flat row each, with what
 * was logged and what the app derived from it side by side.
 *
 * It is deliberately a *reading* of the log rather than the log. Everything
 * here is already folded — 1R, the R-multiple, the Capture Rate — so nothing
 * downstream has to know how any of it is worked out, and nobody computes an
 * R-multiple by hand in a cell. What that costs is that this file cannot be
 * restored from: it holds no events, no Plans that were skipped and no
 * Evidence. That is what a Backup is for, and it is why a CSV export does not
 * answer the Rule that asks for one.
 *
 * Abandoned Plans are absent for the same reason they carry no result: a skip
 * moved no money. They are in the log and in the Backup, where they belong.
 */

/** One column: what the header calls it, and how a Trade answers it. */
interface Column {
  readonly header: string;
  value(row: TradeRow): string;
}

const columns: readonly Column[] = [
  { header: 'Closed at', value: ({ trade }) => trade.closedAt },
  { header: 'Closed at edited', value: ({ trade }) => yesNo(trade.closedAtEdited) },
  { header: 'Opened at', value: ({ trade }) => trade.openedAt },
  { header: 'Opened at edited', value: ({ trade }) => yesNo(trade.openedAtEdited) },
  { header: 'Direction', value: ({ trade }) => trade.plan.direction },
  { header: 'Entry price', value: ({ trade }) => number(trade.entryPrice) },
  { header: 'Exit price', value: ({ trade }) => number(trade.exitPrice) },
  // Required on losers as well as winners, and the denominator of the Capture
  // Rate below: a round-trip is a loser with a distant Best Price, and it
  // cannot be seen in a spreadsheet that does not carry this column.
  { header: 'Best Price', value: ({ trade }) => number(trade.bestPrice) },
  // The Stop the Plan was sized at, which is the one 1R is fixed to — never
  // where the Stop finished up (ADR-0001).
  { header: 'Stop', value: ({ trade }) => number(trade.plan.stopPrice) },
  { header: 'Stop moves', value: ({ trade }) => String(trade.stopMoves.length) },
  { header: 'Leverage', value: ({ trade }) => number(trade.plan.leverage) },
  { header: 'Liquidation price', value: ({ trade }) => number(trade.plan.liquidationPrice) },
  { header: 'Risk %', value: ({ trade }) => number(trade.plan.riskFraction * 100) },
  { header: 'Notional', value: ({ trade }) => number(trade.plan.notional) },
  { header: 'Margin', value: ({ trade }) => number(trade.plan.margin) },
  { header: '1R', value: ({ trade }) => number(trade.plan.oneR) },
  { header: 'Gross P&L', value: ({ trade }) => number(trade.grossPnl) },
  { header: 'Fees', value: ({ trade }) => number(trade.fees) },
  { header: 'Realized P&L', value: ({ trade }) => number(trade.realizedPnl) },
  { header: 'R-multiple', value: ({ rMultiple }) => number(rMultiple) },
  // A share rather than a percentage, so a spreadsheet can average a column of
  // them. Blank where no move was ever available: a zero there would read as a
  // verdict on how the Trade was managed, and there is none to give.
  { header: 'Capture Rate', value: ({ captureRate }) => (captureRate === null ? '' : number(captureRate)) },
  { header: 'Exit Reason', value: ({ trade }) => trade.exitReason },
  { header: 'Scaled in', value: ({ trade }) => yesNo(trade.scaledIn) },
  { header: 'Scaled out', value: ({ trade }) => yesNo(trade.scaledOut) },
  { header: 'Above default Risk', value: ({ trade }) => yesNo(trade.plan.aboveDefaultRisk) },
  // By id, and every one of them: compliance is a column to be counted
  // alongside Expectancy, which is the whole reason overriding is allowed.
  {
    header: 'Violations',
    value: ({ trade }) => trade.plan.violations.map((violation) => violation.ruleId).join('; '),
  },
  // Whether there is a screenshot, and nothing whatsoever out of it — not even
  // the id, which names a blob no spreadsheet can reach (ADR-0003).
  { header: 'Evidence', value: ({ trade }) => yesNo(trade.evidenceId !== null) },
  { header: 'Notes', value: ({ trade }) => trade.notes },
  { header: 'Plan id', value: ({ trade }) => trade.plan.id },
];

export function tradesCsv(state: DerivedState): string {
  // Oldest first, against the log's newest-first: a spreadsheet plots an
  // equity curve down the rows, and reading a curve backwards is work the file
  // can save whoever opens it. Ordered by when each Trade closed, corrections
  // included, exactly as the log orders itself.
  const trades = tradeLog(state)
    .filter((row): row is TradeRow => row.kind === 'Trade')
    .reverse();

  return [
    columns.map((column) => column.header),
    ...trades.map((row) => columns.map((column) => column.value(row))),
  ]
    .map((cells) => cells.map(escaped).join(','))
    // CRLF, which is what RFC 4180 asks for and what a spreadsheet on any
    // platform opens without being told anything.
    .join('\r\n');
}

/**
 * A figure as a cell: the number, and nothing dressed up. No currency symbol
 * and no thousands separator — both turn a number a spreadsheet could add up
 * into text it cannot.
 *
 * Trimmed to four decimals, which is more than any figure here carries meaning
 * to and just few enough to drop what a division leaves behind: an R-multiple
 * of 2.4000000000000004 is 2.4.
 */
function number(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

/**
 * One cell, quoted where it has to be. Notes are free text and the only field
 * here that can hold a comma, a quote or a line break — and a note that split
 * a row in two would silently corrupt every column after it.
 */
function escaped(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
