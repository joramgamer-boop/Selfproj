import { evaluate } from './commands';
import { deriveState, emptyState } from './state';
import { fixedClock } from './clock';

const clock = fixedClock('2026-05-04T12:30:00.000Z');

describe('recording a Deposit', () => {
  it('produces a Deposit event for the amount given', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 500 }, clock);

    expect(evaluation).toEqual({
      outcome: 'append',
      events: [{ type: 'Deposit', at: '2026-05-04T12:30:00.000Z', amount: 500 }],
    });
  });

  it('stamps the event with the time from the injected clock', () => {
    const evaluation = evaluate(
      emptyState,
      { type: 'RecordDeposit', amount: 500 },
      fixedClock('2027-11-30T23:59:59.000Z'),
    );

    expect(evaluation).toMatchObject({
      events: [{ at: '2027-11-30T23:59:59.000Z' }],
    });
  });

  it('raises the Balance once the event is folded back in', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 500 }, clock);

    if (evaluation.outcome !== 'append') throw new Error('expected the Deposit to be recordable');

    expect(deriveState(evaluation.events).balance).toBe(500);
  });

  it('records the amount to the cent', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 1234.567 }, clock);

    expect(evaluation).toMatchObject({ events: [{ amount: 1234.57 }] });
  });

  it('is rejected when the amount is zero', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: 0 }, clock);

    expect(evaluation).toEqual({
      outcome: 'rejected',
      reason: 'A Deposit must be an amount greater than zero.',
    });
  });

  it('is rejected when the amount is negative', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: -100 }, clock);

    expect(evaluation.outcome).toBe('rejected');
  });

  it('is rejected when the amount is not a number', () => {
    const evaluation = evaluate(emptyState, { type: 'RecordDeposit', amount: Number.NaN }, clock);

    expect(evaluation.outcome).toBe('rejected');
  });

  it('is rejected when the amount is infinite', () => {
    const evaluation = evaluate(
      emptyState,
      { type: 'RecordDeposit', amount: Number.POSITIVE_INFINITY },
      clock,
    );

    expect(evaluation.outcome).toBe('rejected');
  });
});
