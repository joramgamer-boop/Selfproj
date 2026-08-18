import { solveSettlement } from './settlement';
import type { ClosingRecord } from './trade';
import { deriveState } from './state';
import type { Plan } from './state';
import { deposit, planCreated } from '../test/events';

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
