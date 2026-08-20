import { statisticsOf } from './statistics';
import { deriveState } from './state';
import type { Violation } from './rules';
import {
  breakeven,
  closedTrades,
  day,
  deposit,
  planAbandoned,
  planCreated,
  positionOpened,
} from '../test/events';

const funded = deposit(1000, '2026-01-01T09:00:00.000Z');

describe('how many Trades the statistics stand on', () => {
  it('counts the closed Trades', () => {
    const state = deriveState([
      funded,
      ...closedTrades({ exitPrice: 108, bestPrice: 110 }, { exitPrice: 96, bestPrice: 100 }),
    ]);

    expect(statisticsOf(state).trades).toBe(2);
  });
});

describe('the gate on the statistics', () => {
  it('stays shut at 29 closed Trades', () => {
    const state = deriveState([funded, ...closedTrades(...breakeven(29))]);

    expect(statisticsOf(state).readable).toBe(false);
  });

  it('opens at exactly 30 closed Trades', () => {
    const state = deriveState([funded, ...closedTrades(...breakeven(30))]);

    expect(statisticsOf(state).readable).toBe(true);
  });
});

/**
 * Four Trades worked out by hand, with no fees anywhere: at 2% Risk the
 * Notional is solved from the Risk, so with fees at zero an R-multiple is
 * exactly the move over the 4-point Stop distance and no Balance is needed to
 * read it.
 *
 * | exit | Best Price | R  | Capture Rate  |
 * | ---- | ---------- | -- | ------------- |
 * | 108  | 110        | +2 | 8/10 = 80%    |
 * | 104  | 104        | +1 | 4/4  = 100%   |
 * | 96   | 100        | −1 | no move — none|
 * | 100  | 108        |  0 | 0/8  = 0%     |
 */
const handWorked = closedTrades(
  { exitPrice: 108, bestPrice: 110 },
  { exitPrice: 104, bestPrice: 104 },
  { exitPrice: 96, bestPrice: 100 },
  { exitPrice: 100, bestPrice: 108 },
);

describe('what the Trades came to', () => {
  const statistics = statisticsOf(deriveState([funded, ...handWorked]));

  it('counts the winners and the losers, and a breakeven as neither', () => {
    expect(statistics).toMatchObject({ trades: 4, wins: 2, losses: 1 });
  });

  it('reads the win rate over every Trade, breakevens included', () => {
    expect(statistics.winRate).toBe(0.5);
  });

  it('averages the winners and the losers apart', () => {
    expect(statistics.averageWinR).toBe(1.5);
    expect(statistics.averageLossR).toBe(-1);
  });

  it('reports Expectancy per Trade in R', () => {
    // (0.5 × +1.5) + (0.25 × −1) = +0.5R, with the breakeven in the
    // denominator of both rates and in neither average.
    expect(statistics.expectancy).toBeCloseTo(0.5, 10);
  });
});

describe('what share of the available move was kept', () => {
  it('averages the Capture Rate over the Trades that had a move to keep', () => {
    // (80% + 100% + 0%) ÷ 3. The stop-out is left out rather than counted as
    // zero: no move was ever available on it, so it has no share to report.
    expect(statisticsOf(deriveState([funded, ...handWorked])).averageCaptureRate).toBeCloseTo(
      0.6,
      10,
    );
  });

  it('has no average where no Trade ever had a move available', () => {
    const state = deriveState([funded, ...closedTrades({ exitPrice: 96, bestPrice: 100 })]);

    expect(statisticsOf(state).averageCaptureRate).toBeNull();
  });
});

/**
 * Two Trades of $20 Risk each, $2 of fees on both, topped back up between them
 * so that both are sized to the same 1R: a −1R stop-out that cost −1.1R once
 * the exchange was paid, and a +1R winner that kept +0.9R.
 *
 * It is the fixture the whole ticket is about. On the prices alone this pair
 * is flat; $4 of fees against $40 of Risk taken is a 10% drag, and it is the
 * difference between an Expectancy of zero and one of −0.1R per Trade.
 */
const afterFees = closedTrades(
  { exitPrice: 96, bestPrice: 100, fees: 2 },
  { exitPrice: 104, bestPrice: 104, fees: 2, toppedUpBy: 22 },
);

describe('what the exchange took', () => {
  const statistics = statisticsOf(deriveState([funded, ...afterFees]));

  it('reports the fees as a share of the Risk that was taken', () => {
    expect(statistics.feeDrag).toBeCloseTo(0.1, 10);
  });

  it('leaves a pair that was flat on the prices negative once fees are in', () => {
    expect(statistics.averageWinR).toBeCloseTo(0.9, 10);
    expect(statistics.averageLossR).toBeCloseTo(-1.1, 10);
    expect(statistics.expectancy).toBeCloseTo(-0.1, 10);
  });

  it('has no drag to report before a Trade has taken any Risk', () => {
    expect(statisticsOf(deriveState([funded])).feeDrag).toBeNull();
  });
});

/**
 * $1,000 taken to a peak of $1,100, given back to $990, and part-recovered to
 * $1,009.80 — a fall of $110 from the peak, which is a 10% Drawdown, and then
 * a climb back to 8.2% below it.
 */
const roundTrip = closedTrades(
  { exitPrice: 120, bestPrice: 120 },
  { exitPrice: 80, bestPrice: 100 },
  { exitPrice: 104, bestPrice: 104 },
);

describe('the equity curve', () => {
  const statistics = statisticsOf(deriveState([funded, ...roundTrip]));

  it('runs between the Balance the Ledger opened and closed at', () => {
    expect(statistics.equityCurve).toMatchObject({ from: 1000, to: 1009.8 });
  });

  it('plots a point per movement of the Ledger, the Deposit included', () => {
    // Four movements across the width, evenly spaced.
    expect(statistics.equityCurve.points.map((point) => point.x)).toEqual([
      0,
      expect.closeTo(33.33, 2),
      expect.closeTo(66.67, 2),
      100,
    ]);
  });

  it('puts the highest Balance at the top of the box and the lowest at the bottom', () => {
    // $990 to $1,100 across the box: the peak is the top, the trough is the
    // bottom, and $1,009.80 sits 18% of the way up from the trough.
    expect(statistics.equityCurve.points.map((point) => point.y)).toEqual([
      expect.closeTo(90.91, 2),
      0,
      100,
      expect.closeTo(82, 2),
    ]);
  });

  it('keeps the deepest fall from the peak, not the one standing now', () => {
    expect(statistics.maxDrawdown).toBe(0.1);
  });

  it('has no Drawdown and no line to draw against an empty Ledger', () => {
    expect(statisticsOf(deriveState([]))).toMatchObject({
      maxDrawdown: 0,
      equityCurve: { from: 0, to: 0, points: [] },
    });
  });

  it('draws no line through a single movement, which is a dot', () => {
    expect(statisticsOf(deriveState([funded])).equityCurve).toEqual({
      from: 1000,
      to: 1000,
      points: [],
    });
  });
});

describe('rule breaks against rule-following Trades', () => {
  const overridden: Violation[] = [{ ruleId: 'liquidation-buffer', reason: 'Close enough.' }];
  const statistics = statisticsOf(
    deriveState([
      funded,
      ...closedTrades(
        { exitPrice: 108, bestPrice: 110 },
        { exitPrice: 96, bestPrice: 100, violations: overridden },
        { exitPrice: 104, bestPrice: 104 },
      ),
    ]),
  );

  it('holds the Trades that carry a Violation apart, with the same figures over them', () => {
    expect(statistics.withViolations).toMatchObject({
      trades: 1,
      wins: 0,
      losses: 1,
      expectancy: -1,
    });
  });

  it('holds the Trades that broke no Rule apart the same way', () => {
    expect(statistics.withoutViolations).toMatchObject({
      trades: 2,
      wins: 2,
      losses: 0,
      averageWinR: 1.5,
      expectancy: 1.5,
    });
  });

  it('reports no figures at all for a cohort no Trade fell into', () => {
    const unbroken = statisticsOf(deriveState([funded, ...handWorked])).withViolations;

    // Not a win rate of zero and not an Expectancy of +0.00R: those are
    // measurements, and nothing here was measured.
    expect(unbroken).toEqual({
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: null,
      averageWinR: null,
      averageLossR: null,
      expectancy: null,
      averageCaptureRate: null,
      feeDrag: null,
    });
  });

  it('counts every Trade in the figures over the whole log, Violations and all', () => {
    expect(statistics).toMatchObject({ trades: 3, wins: 2, losses: 1 });
  });
});

describe('what is left out', () => {
  it('changes nothing when a Plan is skipped or one is still live', () => {
    const decided = deriveState([funded, ...handWorked]);
    const alsoWaiting = deriveState([
      funded,
      ...handWorked,
      // A skip is data — it sits in the log for good — but it moved no money,
      // so it belongs to no figure here. Nor does a Position that has not
      // come to anything yet.
      planCreated({ at: day(10), id: 'skipped' }),
      planAbandoned({ at: day(11), planId: 'skipped' }),
      planCreated({ at: day(12), id: 'live' }),
      positionOpened(day(13), 'live'),
    ]);

    expect(statisticsOf(alsoWaiting)).toEqual(statisticsOf(decided));
  });
});
