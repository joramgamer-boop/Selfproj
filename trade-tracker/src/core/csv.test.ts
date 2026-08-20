import { tradesCsv } from './csv';
import { deriveState } from './state';
import {
  deposit,
  evidenceAttached,
  planAbandoned,
  planCreated,
  positionClosed,
  positionOpened,
  stopMoved,
} from '../test/events';

const funded = deposit(500, '2026-01-01T09:00:00.000Z');
const openedAt = '2026-01-03T09:00:00.000Z';

/** The standard winner: +$25 gross on a 4% Stop at 2% Risk, $1 of fees. */
const aTrade = [
  planCreated({ at: '2026-01-02T09:00:00.000Z' }),
  positionOpened(openedAt),
  positionClosed({ at: '2026-01-04T09:00:00.000Z', openedAt }),
];

/** The file back into rows of cells, so a test can ask for a column by name. */
function table(csv: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character !== '"') cell += character;
      else if (csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      cells.push(cell);
      cell = '';
    } else if (csv.startsWith('\r\n', index)) {
      cells.push(cell);
      rows.push(cells);
      cells = [];
      cell = '';
      index += 1;
    } else cell += character;
  }

  cells.push(cell);
  rows.push(cells);
  return rows;
}

/** One Trade's row, as a column-name-to-value lookup. */
function row(csv: string, index = 0): Record<string, string> {
  const [headers, ...rows] = table(csv);
  return Object.fromEntries(headers.map((header, column) => [header, rows[index][column]]));
}

describe('the CSV of closed Trades', () => {
  it('is a header row alone when nothing has closed', () => {
    expect(table(tradesCsv(deriveState([funded])))).toHaveLength(1);
  });

  it('names every column in the header', () => {
    const [headers] = table(tradesCsv(deriveState([funded])));

    expect(headers).toContain('R-multiple');
    expect(headers).toContain('Capture Rate');
    expect(headers).toContain('1R');
    expect(headers).toContain('Fees');
    expect(headers).toContain('Violations');
  });

  it('is one row per closed Trade', () => {
    const twoTrades = deriveState([
      funded,
      ...aTrade,
      planCreated({ at: '2026-02-02T09:00:00.000Z', id: 'plan-2' }),
      positionOpened('2026-02-03T09:00:00.000Z', 'plan-2'),
      positionClosed({
        at: '2026-02-04T09:00:00.000Z',
        openedAt: '2026-02-03T09:00:00.000Z',
        planId: 'plan-2',
      }),
    ]);

    expect(table(tradesCsv(twoTrades))).toHaveLength(3);
  });

  it('carries the fields that were logged', () => {
    expect(row(tradesCsv(deriveState([funded, ...aTrade])))).toMatchObject({
      Direction: 'long',
      'Entry price': '100',
      'Exit price': '110',
      'Best Price': '114',
      Stop: '96',
      Fees: '1',
      'Exit Reason': 'take-profit hit',
      'Scaled in': 'no',
      'Scaled out': 'no',
    });
  });

  it('carries the figures the app derived, so nothing is computed by hand', () => {
    // $10 of Risk on a $250 Notional: +$25 gross, $1 of fees, +$24 net.
    expect(row(tradesCsv(deriveState([funded, ...aTrade])))).toMatchObject({
      '1R': '10',
      'Gross P&L': '25',
      'Realized P&L': '24',
      'R-multiple': '2.4',
      'Capture Rate': '0.7143',
    });
  });

  it('leaves the Capture Rate empty where no move was ever available', () => {
    const straightDown = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt,
        exitPrice: 96,
        bestPrice: 100,
        exitReason: 'stop hit',
      }),
    ]);

    expect(row(tradesCsv(straightDown))['Capture Rate']).toBe('');
  });

  it('says whether the timestamps were corrected, so hold durations can be trusted', () => {
    const corrected = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt,
        closedAt: '2026-01-04T07:00:00.000Z',
      }),
    ]);

    expect(row(tradesCsv(corrected))).toMatchObject({
      'Closed at': '2026-01-04T07:00:00.000Z',
      'Closed at edited': 'yes',
      'Opened at edited': 'no',
    });
  });

  it('names every Rule that was overridden to take the Trade', () => {
    const broken = deriveState([
      funded,
      planCreated({
        at: '2026-01-02T09:00:00.000Z',
        violations: [
          { ruleId: 'liquidation-buffer', reason: 'Wide stop, small size.' },
          { ruleId: 'back-up-the-log', reason: 'Backing up tonight.' },
        ],
      }),
      positionOpened(openedAt),
      positionClosed({ at: '2026-01-04T09:00:00.000Z', openedAt }),
    ]);

    expect(row(tradesCsv(broken)).Violations).toBe('liquidation-buffer; back-up-the-log');
  });

  it('counts the times the Stop was moved, since a trailed Stop explains the exit', () => {
    const trailed = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      stopMoved({ at: '2026-01-03T10:00:00.000Z', stopPrice: 98 }),
      stopMoved({ at: '2026-01-03T11:00:00.000Z', stopPrice: 100 }),
      positionClosed({ at: '2026-01-04T09:00:00.000Z', openedAt }),
    ]);

    expect(row(tradesCsv(trailed))['Stop moves']).toBe('2');
  });

  it('says whether a screenshot stands behind the Trade, and never anything out of it', () => {
    const withProof = deriveState([
      funded,
      ...aTrade,
      evidenceAttached({ at: '2026-01-04T09:05:00.000Z' }),
    ]);

    expect(row(tradesCsv(withProof)).Evidence).toBe('yes');
    // The blob's id is storage's business. A spreadsheet can do nothing with
    // it, and no figure in this file came out of the picture (ADR-0003).
    expect(tradesCsv(withProof)).not.toContain('shot-1');
  });

  it('quotes a note that carries a comma, a quote or a line break', () => {
    const chatty = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt,
        notes: 'Entered late, "chased" it.\nSame leak again.',
      }),
    ]);

    const csv = tradesCsv(chatty);

    expect(csv).toContain('"Entered late, ""chased"" it.\nSame leak again."');
    // The line break inside the note must not split the row in two.
    expect(table(csv)).toHaveLength(2);
  });

  it('leaves out a Plan that was never taken — a skip moved no money and has no result', () => {
    const skipped = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z', id: 'plan-9' }),
      planAbandoned({ at: '2026-01-02T10:00:00.000Z', planId: 'plan-9' }),
    ]);

    expect(table(tradesCsv(skipped))).toHaveLength(1);
  });

  it('reads oldest first, the way a spreadsheet plots an equity curve', () => {
    const two = deriveState([
      funded,
      ...aTrade,
      planCreated({ at: '2026-02-02T09:00:00.000Z', id: 'plan-2' }),
      positionOpened('2026-02-03T09:00:00.000Z', 'plan-2'),
      positionClosed({
        at: '2026-02-04T09:00:00.000Z',
        openedAt: '2026-02-03T09:00:00.000Z',
        planId: 'plan-2',
      }),
    ]);

    const [, first, second] = table(tradesCsv(two));

    expect(first[0] < second[0]).toBe(true);
  });
});
