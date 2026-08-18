import type { ClosePosition, CreatePlan } from './commands';
import { evaluate } from './commands';
import { deriveState, emptyState } from './state';
import { fixedClock } from './clock';
import { sequentialIds } from './ids';
import { deposit, planCreated, positionClosed, positionOpened } from '../test/events';

const clock = fixedClock('2026-05-04T12:30:00.000Z');
const context = () => ({ clock, ids: sequentialIds() });

describe('recording a Deposit', () => {
  it('produces a Deposit event for the amount given', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 500 }, context());

    expect(evaluation).toEqual({
      outcome: 'append',
      events: [{ type: 'Deposit', at: '2026-05-04T12:30:00.000Z', amount: 500 }],
    });
  });

  it('stamps the event with the time from the injected clock', () => {
    const evaluation = evaluate(
      emptyState,
      { type: 'RecordDeposit', amount: 500 },
      { clock: fixedClock('2027-11-30T23:59:59.000Z'), ids: sequentialIds() },
    );

    expect(evaluation).toMatchObject({
      events: [{ at: '2027-11-30T23:59:59.000Z' }],
    });
  });

  it('raises the Balance once the event is folded back in', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 500 }, context());

    if (evaluation.outcome !== 'append') throw new Error('expected the Deposit to be recordable');

    expect(deriveState(evaluation.events).balance).toBe(500);
  });

  it('records the amount to the cent', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 1234.567 }, context());

    expect(evaluation).toMatchObject({ events: [{ amount: 1234.57 }] });
  });

  it('is rejected when the amount is zero', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 0 }, context());

    expect(evaluation).toEqual({
      outcome: 'rejected',
      reason: 'A Deposit must be an amount greater than zero.',
    });
  });

  it('is rejected when the amount is negative', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: -100 }, context());

    expect(evaluation.outcome).toBe('rejected');
  });

  it('is rejected when the amount is not a number', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: Number.NaN }, context());

    expect(evaluation.outcome).toBe('rejected');
  });

  it('is rejected when the amount is infinite', () => {
    const evaluation = evaluate(
      emptyState,
      { type: 'RecordDeposit', amount: Number.POSITIVE_INFINITY },
      context(),
    );

    expect(evaluation.outcome).toBe('rejected');
  });
});

describe('creating a Plan', () => {
  const funded = deriveState([deposit(500, '2026-01-01T09:00:00.000Z')]);
  const aLong: CreatePlan = {
    type: 'CreatePlan',
    direction: 'long',
    entryPrice: 100,
    stopPrice: 96,
    leverage: 5,
    liquidationPrice: 80,
    riskFraction: 0.02,
  };

  it('produces a PlanCreated event holding what was typed', () => {
    const evaluation = evaluate(funded, aLong, context());

    expect(evaluation).toEqual({
      outcome: 'append',
      events: [
        {
          type: 'PlanCreated',
          at: '2026-05-04T12:30:00.000Z',
          id: 'plan-1',
          direction: 'long',
          entryPrice: 100,
          stopPrice: 96,
          leverage: 5,
          liquidationPrice: 80,
          riskFraction: 0.02,
          violations: [],
        },
      ],
    });
  });

  it('stores no Notional on the event, because folding it back solves one', () => {
    const evaluation = evaluate(funded, aLong, context());

    if (evaluation.outcome !== 'append') throw new Error('expected the Plan to be creatable');
    expect(evaluation.events[0]).not.toHaveProperty('notional');
    const log = [deposit(500, '2026-01-01T09:00:00.000Z'), ...evaluation.events];
    expect(deriveState(log).plans[0]).toMatchObject({ notional: 250, margin: 50, oneR: 10 });
  });

  it('gives each Plan its own id', () => {
    const ids = sequentialIds();
    const first = evaluate(funded, aLong, { clock, ids });
    const second = evaluate(funded, aLong, { clock, ids });

    expect([first, second]).toMatchObject([
      { events: [{ id: 'plan-1' }] },
      { events: [{ id: 'plan-2' }] },
    ]);
  });

  it('rounds the Risk fraction, so the event matches the screen', () => {
    const evaluation = evaluate(funded, { ...aLong, riskFraction: 2.9 / 100 }, context());

    expect(evaluation).toMatchObject({ events: [{ riskFraction: 0.029 }] });
  });

  it('is rejected with the reason the figures could not be sized', () => {
    const evaluation = evaluate(funded, { ...aLong, stopPrice: 100 }, context());

    expect(evaluation).toEqual({
      outcome: 'rejected',
      reason: 'The Stop on a long must sit below the entry price.',
    });
  });

  it('is rejected when there is no Balance to size against', () => {
    const evaluation = evaluate(emptyState, aLong, context());

    expect(evaluation).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/record a deposit/i),
    });
  });

  it('is rejected when the Risk asked for is above 3%', () => {
    const evaluation = evaluate(funded, { ...aLong, riskFraction: 0.05 }, context());

    expect(evaluation).toMatchObject({ outcome: 'rejected' });
  });
});

describe('changing the Risk default', () => {
  it('records a timestamped event', () => {
    const evaluation = evaluate(emptyState, { type: 'SetRiskDefault', riskFraction: 0.03 }, context());

    expect(evaluation).toEqual({
      outcome: 'append',
      events: [{ type: 'RiskDefaultChanged', at: '2026-05-04T12:30:00.000Z', riskFraction: 0.03 }],
    });
  });

  it('moves the default once the event is folded back in', () => {
    const evaluation = evaluate(emptyState, { type: 'SetRiskDefault', riskFraction: 0.03 }, context());

    if (evaluation.outcome !== 'append') throw new Error('expected the default to be settable');
    expect(deriveState(evaluation.events).riskDefault).toBe(0.03);
  });

  it('is rejected outside the 2–3% band the framework allows', () => {
    expect(
      evaluate(emptyState, { type: 'SetRiskDefault', riskFraction: 0.05 }, context()),
    ).toEqual({
      outcome: 'rejected',
      reason: 'Risk must be between 2% and 3% of Balance.',
    });
    expect(
      evaluate(emptyState, { type: 'SetRiskDefault', riskFraction: 0.01 }, context()),
    ).toMatchObject({ outcome: 'rejected' });
  });
});

const funded = deposit(500, '2026-01-01T09:00:00.000Z');
const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
const openedAt = '2026-01-03T09:00:00.000Z';

const sized = deriveState([funded, planned]);
const live = deriveState([funded, planned, positionOpened(openedAt)]);
const settled = deriveState([
  funded,
  planned,
  positionOpened(openedAt),
  positionClosed({ at: '2026-01-03T15:00:00.000Z', openedAt }),
]);

/** A complete close: everything the record needs, and nothing solved. */
const aClose: ClosePosition = {
  type: 'ClosePosition',
  planId: 'plan-1',
  entryPrice: 100,
  exitPrice: 110,
  bestPrice: 114,
  fees: 1,
  exitReason: 'take-profit hit',
  scaledIn: false,
  scaledOut: false,
  notes: '',
  openedAt: null,
  closedAt: null,
};

describe('taking a Plan live', () => {
  it('produces a PositionOpened stamped from the clock', () => {
    expect(evaluate(sized, { type: 'OpenPosition', planId: 'plan-1' }, context())).toEqual({
      outcome: 'append',
      events: [
        { type: 'PositionOpened', at: '2026-05-04T12:30:00.000Z', planId: 'plan-1', violations: [] },
      ],
    });
  });

  it('opens the Position once the event is folded back in', () => {
    const evaluation = evaluate(sized, { type: 'OpenPosition', planId: 'plan-1' }, context());

    if (evaluation.outcome !== 'append') throw new Error('expected the Plan to be openable');
    const state = deriveState([funded, planned, ...evaluation.events]);
    expect(state.openPositions[0]).toMatchObject({ plan: { id: 'plan-1', oneR: 10 } });
  });

  it('is rejected when the Plan is not on the record', () => {
    expect(evaluate(sized, { type: 'OpenPosition', planId: 'plan-9' }, context())).toEqual({
      outcome: 'rejected',
      reason: 'That Plan is not on the record.',
    });
  });

  it('is rejected when that Plan is already live', () => {
    expect(
      evaluate(live, { type: 'OpenPosition', planId: 'plan-1' }, context()),
    ).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/already live/i) });
  });

  it('is rejected when that Plan has already closed as a Trade', () => {
    expect(
      evaluate(settled, { type: 'OpenPosition', planId: 'plan-1' }, context()),
    ).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/already closed/i) });
  });
});

describe('closing a Position', () => {
  it('produces a PositionClosed holding what was typed at the close', () => {
    expect(evaluate(live, aClose, context())).toEqual({
      outcome: 'append',
      events: [
        {
          type: 'PositionClosed',
          at: '2026-05-04T12:30:00.000Z',
          planId: 'plan-1',
          openedAt,
          closedAt: '2026-05-04T12:30:00.000Z',
          entryPrice: 100,
          exitPrice: 110,
          bestPrice: 114,
          fees: 1,
          exitReason: 'take-profit hit',
          scaledIn: false,
          scaledOut: false,
          notes: '',
        },
      ],
    });
  });

  it('moves the Balance by the realized P&L once folded back in', () => {
    const evaluation = evaluate(live, aClose, context());

    if (evaluation.outcome !== 'append') throw new Error('expected the Position to be closable');
    const state = deriveState([funded, planned, positionOpened(openedAt), ...evaluation.events]);
    expect(state.balance).toBe(524);
    expect(state.trades[0]).toMatchObject({ realizedPnl: 24 });
  });

  it('takes the hold as the trader corrects it, rather than as it was stamped', () => {
    const evaluation = evaluate(
      live,
      {
        ...aClose,
        openedAt: '2026-01-03T08:30:00.000Z',
        closedAt: '2026-01-03T15:00:00.000Z',
      },
      context(),
    );

    expect(evaluation).toMatchObject({
      events: [
        {
          at: '2026-05-04T12:30:00.000Z',
          openedAt: '2026-01-03T08:30:00.000Z',
          closedAt: '2026-01-03T15:00:00.000Z',
        },
      ],
    });
  });

  it('is rejected when the corrected close sits before the open', () => {
    expect(
      evaluate(live, { ...aClose, closedAt: '2026-01-02T09:00:00.000Z' }, context()),
    ).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/cannot close before/i),
    });
  });

  it('is rejected when a corrected timestamp is not a time', () => {
    expect(evaluate(live, { ...aClose, closedAt: 'yesterday-ish' }, context())).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/not a time/i),
    });
  });

  it('is rejected when no Position is open on that Plan', () => {
    expect(evaluate(sized, aClose, context())).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/no Position open/i),
    });
  });

  it('is rejected without a Best Price, winner or loser', () => {
    expect(evaluate(live, { ...aClose, bestPrice: 0 }, context())).toEqual({
      outcome: 'rejected',
      reason: 'Best Price is required on every Trade, winners and losers alike.',
    });
    expect(
      evaluate(live, { ...aClose, exitPrice: 96, bestPrice: 0 }, context()),
    ).toMatchObject({ outcome: 'rejected' });
  });

  it('is rejected when the Best Price on a long sits below the entry or the exit', () => {
    expect(evaluate(live, { ...aClose, bestPrice: 99 }, context())).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/highest the price reached/i),
    });
    expect(evaluate(live, { ...aClose, bestPrice: 105 }, context())).toMatchObject({
      outcome: 'rejected',
    });
  });

  it('is rejected when the Best Price on a short sits above the entry or the exit', () => {
    const short = deriveState([
      funded,
      planCreated({
        at: '2026-01-02T09:00:00.000Z',
        direction: 'short',
        stopPrice: 104,
        liquidationPrice: 120,
      }),
      positionOpened(openedAt),
    ]);

    expect(
      evaluate(short, { ...aClose, exitPrice: 90, bestPrice: 101 }, context()),
    ).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/lowest the price/i) });
  });

  it('is rejected without an Exit Reason from the list', () => {
    expect(evaluate(live, { ...aClose, exitReason: '' }, context())).toEqual({
      outcome: 'rejected',
      reason: 'Pick an Exit Reason.',
    });
    expect(
      evaluate(live, { ...aClose, exitReason: 'got bored' }, context()),
    ).toMatchObject({ outcome: 'rejected' });
  });

  it('is rejected when the fees were never recorded', () => {
    expect(evaluate(live, { ...aClose, fees: Number.NaN }, context())).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/even if they were zero/i),
    });
  });

  it('takes zero fees, but not negative ones', () => {
    expect(evaluate(live, { ...aClose, fees: 0 }, context())).toMatchObject({
      outcome: 'append',
    });
    expect(evaluate(live, { ...aClose, fees: -1 }, context())).toMatchObject({
      outcome: 'rejected',
    });
  });

  it('records the fees to the cent, so the Ledger adds up', () => {
    expect(evaluate(live, { ...aClose, fees: 1.006 }, context())).toMatchObject({
      events: [{ fees: 1.01 }],
    });
  });

  it('records a scaled exit as one Trade at its weighted average, flagged', () => {
    const evaluation = evaluate(live, { ...aClose, scaledOut: true }, context());

    if (evaluation.outcome !== 'append') throw new Error('expected the Position to be closable');
    expect(evaluation.events).toHaveLength(1);
    expect(evaluation.events[0]).toMatchObject({ exitPrice: 110, scaledOut: true });
  });

  it('keeps the notes, without the whitespace around them', () => {
    expect(
      evaluate(live, { ...aClose, notes: '  Exited on a wick.  ' }, context()),
    ).toMatchObject({ events: [{ notes: 'Exited on a wick.' }] });
  });
});
