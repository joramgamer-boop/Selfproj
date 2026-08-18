import { deriveState } from './state';
import { deposit, planCreated, riskDefaultChanged } from '../test/events';

describe('Balance', () => {
  it('is zero when the Ledger is empty', () => {
    expect(deriveState([]).balance).toBe(0);
  });

  it('is the sum of every Deposit', () => {
    const events = [
      deposit(500, '2026-01-01T09:00:00.000Z'),
      deposit(250, '2026-02-01T09:00:00.000Z'),
    ];

    expect(deriveState(events).balance).toBe(750);
  });

  it('does not drift when Deposits have cents', () => {
    const events = [
      deposit(0.1, '2026-01-01T09:00:00.000Z'),
      deposit(0.2, '2026-01-02T09:00:00.000Z'),
    ];

    expect(deriveState(events).balance).toBe(0.3);
  });
});

describe('the Ledger', () => {
  it('is empty when nothing has been recorded', () => {
    expect(deriveState([]).ledger).toEqual([]);
  });

  it('lists each Deposit with the Balance it produced', () => {
    const events = [
      deposit(500, '2026-01-01T09:00:00.000Z'),
      deposit(250, '2026-02-01T09:00:00.000Z'),
    ];

    expect(deriveState(events).ledger).toEqual([
      {
        seq: 0,
        kind: 'Deposit',
        at: '2026-01-01T09:00:00.000Z',
        amount: 500,
        balanceAfter: 500,
      },
      {
        seq: 1,
        kind: 'Deposit',
        at: '2026-02-01T09:00:00.000Z',
        amount: 250,
        balanceAfter: 750,
      },
    ]);
  });

  it('keeps the order the events were appended in', () => {
    const events = [
      deposit(10, '2026-03-01T09:00:00.000Z'),
      deposit(20, '2026-01-01T09:00:00.000Z'),
    ];

    expect(deriveState(events).ledger.map((entry) => entry.amount)).toEqual([10, 20]);
  });
});

describe('a Plan on the record', () => {
  it('is absent until one has been created', () => {
    expect(deriveState([deposit(500, '2026-01-01T09:00:00.000Z')]).plans).toEqual([]);
  });

  it('carries the Notional solved from the Balance at the time', () => {
    const state = deriveState([
      deposit(500, '2026-01-01T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
    ]);

    expect(state.plans).toEqual([
      {
        id: 'plan-1',
        at: '2026-01-02T09:00:00.000Z',
        direction: 'long',
        entryPrice: 100,
        stopPrice: 96,
        leverage: 5,
        liquidationPrice: 80,
        riskFraction: 0.02,
        balanceAtCreation: 500,
        notional: 250,
        margin: 50,
        oneR: 10,
        aboveDefaultRisk: false,
      },
    ]);
  });

  it('records 1R as the dollar Risk the Plan was sized to', () => {
    const state = deriveState([
      deposit(500, '2026-01-01T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T09:00:00.000Z', stopPrice: 92 }),
    ]);

    // A wider Stop buys a smaller Notional, so the dollar risk — and 1R with
    // it — is unchanged at 2% of $500.
    expect(state.plans[0]).toMatchObject({ notional: 125, oneR: 10 });
  });

  it('leaves 1R alone when a later Deposit raises the Balance', () => {
    const before = [
      deposit(500, '2026-01-01T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
    ];
    const after = [...before, deposit(500, '2026-01-03T09:00:00.000Z')];

    expect(deriveState(after).plans[0]).toMatchObject({ oneR: 10, notional: 250 });
    expect(deriveState(after).plans[0]).toEqual(deriveState(before).plans[0]);
  });

  it('does not appear in the Ledger, having moved no Balance', () => {
    const state = deriveState([
      deposit(500, '2026-01-01T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
    ]);

    expect(state.balance).toBe(500);
    expect(state.ledger).toHaveLength(1);
  });
});

describe('the Risk default', () => {
  it('is 2% until it is changed', () => {
    expect(deriveState([]).riskDefault).toBe(0.02);
  });

  it('is whatever it was last changed to', () => {
    const events = [
      riskDefaultChanged(0.03, '2026-01-01T09:00:00.000Z'),
      riskDefaultChanged(0.025, '2026-02-01T09:00:00.000Z'),
    ];

    expect(deriveState(events).riskDefault).toBe(0.025);
  });

  it('leaves a Plan at the default unflagged', () => {
    const state = deriveState([
      deposit(500, '2026-01-01T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T09:00:00.000Z', riskFraction: 0.02 }),
    ]);

    expect(state.plans[0].aboveDefaultRisk).toBe(false);
  });

  it('flags a Plan that used more Risk than the default', () => {
    const state = deriveState([
      deposit(500, '2026-01-01T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T09:00:00.000Z', riskFraction: 0.03 }),
    ]);

    expect(state.plans[0]).toMatchObject({ aboveDefaultRisk: true, oneR: 15 });
  });

  it('flags a Plan against the default in force when it was created', () => {
    const state = deriveState([
      deposit(500, '2026-01-01T09:00:00.000Z'),
      riskDefaultChanged(0.03, '2026-01-02T09:00:00.000Z'),
      planCreated({ at: '2026-01-03T09:00:00.000Z', riskFraction: 0.03 }),
      // Lowering the default afterwards must not retro-flag a Plan that was
      // compliant when it was made.
      riskDefaultChanged(0.02, '2026-01-04T09:00:00.000Z'),
    ]);

    expect(state.plans[0].aboveDefaultRisk).toBe(false);
  });
});
