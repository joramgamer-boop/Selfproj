import type { CreatePlan } from './commands';
import { evaluate } from './commands';
import { deriveState, emptyState } from './state';
import { fixedClock } from './clock';
import { sequentialIds } from './ids';
import { deposit } from '../test/events';

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
