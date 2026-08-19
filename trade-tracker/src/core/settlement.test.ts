import { rMultipleOf, solveSettlement } from './settlement';
import type { ClosingRecord } from './trade';
import { deriveState } from './state';
import type { Plan, Trade } from './state';
import type { TradeTrackerEvent } from './events';
import {
  deposit,
  planCreated,
  positionClosed,
  positionOpened,
  stopMoved,
} from '../test/events';

/**
 * The Plan the sizing tests worked through: $500 Balance, 2% Risk, a 4% Stop.
 * $10 of Risk buys $250 of Notional at $100, so the Position is 2.5 units and
 * every dollar the price moves is $2.50.
 */
function aPlan(fields: Parameters<typeof planCreated>[0] = { at: '2026-01-02T09:00:00.000Z' }): Plan {
  return deriveState([deposit(500, '2026-01-01T09:00:00.000Z'), planCreated(fields)]).plans[0];
}

const closing: ClosingRecord = {
  entryPrice: 100,
  exitPrice: 110,
  bestPrice: 114,
  fees: 1,
  exitReason: 'take-profit hit',
  scaledIn: false,
  scaledOut: false,
  notes: '',
};

describe('what a closed Position realized', () => {
  it('is the move multiplied by the size the Plan was sized to', () => {
    expect(solveSettlement(aPlan(), { ...closing, fees: 0 })).toMatchObject({
      grossPnl: 25,
      realizedPnl: 25,
    });
  });

  it('takes fees off the realized figure and leaves the gross one alone', () => {
    expect(solveSettlement(aPlan(), closing)).toEqual({
      grossPnl: 25,
      fees: 1,
      realizedPnl: 24,
    });
  });

  it('loses 1R when a long is stopped out, and the fees on top', () => {
    expect(solveSettlement(aPlan(), { ...closing, exitPrice: 96, bestPrice: 101 })).toMatchObject({
      grossPnl: -10,
      realizedPnl: -11,
    });
  });

  it('counts a fall as a win on a short', () => {
    const short = aPlan({
      at: '2026-01-02T09:00:00.000Z',
      direction: 'short',
      stopPrice: 104,
      liquidationPrice: 120,
    });

    expect(solveSettlement(short, { ...closing, exitPrice: 90, bestPrice: 88 })).toMatchObject({
      grossPnl: 25,
      realizedPnl: 24,
    });
  });

  it('counts a rise as a loss on a short', () => {
    const short = aPlan({
      at: '2026-01-02T09:00:00.000Z',
      direction: 'short',
      stopPrice: 104,
      liquidationPrice: 120,
    });

    expect(solveSettlement(short, { ...closing, exitPrice: 104, bestPrice: 99 })).toMatchObject({
      grossPnl: -10,
    });
  });

  it('measures the move from the entry actually filled, not the one planned', () => {
    // Sized at $100 but filled at $101, so only $9 of the move was captured.
    expect(solveSettlement(aPlan(), { ...closing, entryPrice: 101, fees: 0 })).toMatchObject({
      grossPnl: 22.5,
    });
  });

  it('keeps the size the Plan bought when the fill came in away from it', () => {
    // The size is the Plan's — $250 of Notional at $100 — so a worse fill costs
    // captured move, not risk that was never committed.
    const worse = solveSettlement(aPlan(), { ...closing, entryPrice: 101, exitPrice: 111, fees: 0 });

    expect(worse.grossPnl).toBe(25);
  });

  it('rounds to the cent, so a Balance folded from it never drifts', () => {
    expect(solveSettlement(aPlan(), { ...closing, exitPrice: 103.333, fees: 0.005 })).toEqual({
      grossPnl: 8.33,
      fees: 0.01,
      realizedPnl: 8.32,
    });
  });
});

describe('what a Trade came to in R', () => {
  const funded = deposit(500, '2026-01-01T09:00:00.000Z');
  const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
  const openedAt = '2026-01-03T09:00:00.000Z';
  const closedAt = '2026-01-03T15:00:00.000Z';

  /** The Trade the log holds after this sequence of events. */
  function tradeAfter(...moves: TradeTrackerEvent[]): Trade {
    return deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      ...moves,
      positionClosed({ at: closedAt, openedAt, exitPrice: 104, fees: 0 }),
    ]).trades[0];
  }

  it('is the realized P&L in units of the Plan’s 1R', () => {
    // $10 of Risk bought 2.5 units, so a $4 move is $10 — one whole R.
    expect(rMultipleOf(tradeAfter())).toBe(1);
  });

  it('counts a loser as the negative multiple it was', () => {
    const trade = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      positionClosed({ at: closedAt, openedAt, exitPrice: 96, bestPrice: 101, fees: 0 }),
    ]).trades[0];

    expect(rMultipleOf(trade)).toBe(-1);
  });

  it('measures a Trade closed after a tightened Stop against the 1R committed at entry', () => {
    // The Stop was trailed to breakeven and beyond. Recomputing 1R from where
    // it ended up would divide by a risk that no longer existed and report an
    // edge that isn't there (ADR-0001).
    const trailed = tradeAfter(
      stopMoved({ at: '2026-01-03T11:00:00.000Z', stopPrice: 100 }),
      stopMoved({ at: '2026-01-03T12:00:00.000Z', stopPrice: 103 }),
    );

    expect(trailed.plan.oneR).toBe(10);
    expect(rMultipleOf(trailed)).toBe(1);
  });
});
