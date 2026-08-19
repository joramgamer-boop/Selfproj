import { deriveState } from './state';
import {
  deposit,
  planAbandoned,
  planCreated,
  positionClosed,
  positionOpened,
  riskDefaultChanged,
  stopMoved,
} from '../test/events';

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
        status: 'planned',
        abandonReason: null,
        violations: [],
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

describe('taking a Plan live as a Position', () => {
  const funded = deposit(500, '2026-01-01T09:00:00.000Z');
  const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
  const openedAt = '2026-01-03T09:00:00.000Z';

  it('leaves nothing open until a Plan has been opened', () => {
    expect(deriveState([funded, planned]).openPositions).toEqual([]);
  });

  it('carries the Plan it was sized as, untouched', () => {
    const state = deriveState([funded, planned, positionOpened(openedAt)]);

    expect(state.openPositions).toEqual([
      {
        plan: { ...state.plans[0], status: 'open' },
        openedAt,
        // The Stop stands where the Plan put it until it is moved.
        stopPrice: 96,
        stopMoves: [],
      },
    ]);
    expect(state.openPositions[0].plan).toMatchObject({ oneR: 10, notional: 250 });
  });

  it('marks the Plan as live, so it is no longer waiting to be taken', () => {
    const state = deriveState([funded, planned, positionOpened(openedAt)]);

    expect(state.plans[0].status).toBe('open');
  });

  it('moves no Balance, because nothing has been realized yet', () => {
    const state = deriveState([funded, planned, positionOpened(openedAt)]);

    expect(state.balance).toBe(500);
    expect(state.ledger).toHaveLength(1);
  });

  it('folds a second live Position without arguing, since the Rule against one is overridable', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      planCreated({ at: '2026-01-04T09:00:00.000Z', id: 'plan-2' }),
      positionOpened('2026-01-04T10:00:00.000Z', 'plan-2'),
    ]);

    // The framework allows exactly one, and ticket 05 blocks the second — but
    // that block can be overridden with a typed reason, so the log can hold two
    // and the fold has to report what the log holds.
    expect(state.openPositions.map((position) => position.plan.id)).toEqual(['plan-1', 'plan-2']);
  });

  it('refuses to fold a Position opened on a Plan that is not on the record', () => {
    expect(() => deriveState([funded, positionOpened(openedAt, 'plan-9')])).toThrow(/plan-9/);
  });
});

describe('closing a Position into a Trade', () => {
  const funded = deposit(500, '2026-01-01T09:00:00.000Z');
  const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
  const openedAt = '2026-01-03T09:00:00.000Z';
  const closedAt = '2026-01-03T15:00:00.000Z';
  /** The whole fold the app exists for: Plan → Position → Trade. */
  const lifecycle = [
    funded,
    planned,
    positionOpened(openedAt),
    positionClosed({ at: closedAt, openedAt }),
  ];

  it('records one Trade holding what was logged at the close', () => {
    const state = deriveState(lifecycle);

    expect(state.trades).toEqual([
      {
        plan: { ...state.plans[0], status: 'closed' },
        openedAt,
        openedAtEdited: false,
        closedAt,
        closedAtEdited: false,
        entryPrice: 100,
        exitPrice: 110,
        bestPrice: 114,
        fees: 1,
        exitReason: 'take-profit hit',
        scaledIn: false,
        scaledOut: false,
        notes: '',
        grossPnl: 25,
        realizedPnl: 24,
      },
    ]);
  });

  it('closes the Position, leaving nothing open', () => {
    const state = deriveState(lifecycle);

    expect(state.openPositions).toEqual([]);
    expect(state.plans[0].status).toBe('closed');
  });

  it('moves the Balance by the P&L net of fees', () => {
    const state = deriveState(lifecycle);

    expect(state.balance).toBe(524);
    expect(state.ledger.at(-1)).toEqual({
      seq: 3,
      kind: 'Trade',
      at: closedAt,
      amount: 24,
      balanceAfter: 524,
    });
  });

  it('takes a loser out of the Balance, fees and all', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      positionClosed({
        at: closedAt,
        openedAt,
        exitPrice: 96,
        bestPrice: 101,
        exitReason: 'stop hit',
      }),
    ]);

    expect(state.trades[0]).toMatchObject({ grossPnl: -10, realizedPnl: -11 });
    expect(state.balance).toBe(489);
    expect(state.ledger.at(-1)).toMatchObject({ kind: 'Trade', amount: -11 });
  });

  it('books the Trade against the Ledger at the time it actually closed', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      // Logged two hours after the fact, and corrected to say so.
      positionClosed({ at: '2026-01-03T17:00:00.000Z', openedAt, closedAt }),
    ]);

    expect(state.ledger.at(-1)).toMatchObject({ at: closedAt });
  });

  it('marks a corrected timestamp as edited, and an auto-stamped one as not', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      positionClosed({
        at: '2026-01-03T17:00:00.000Z',
        openedAt: '2026-01-03T08:30:00.000Z',
        closedAt: '2026-01-03T17:00:00.000Z',
      }),
    ]);

    expect(state.trades[0]).toMatchObject({
      openedAt: '2026-01-03T08:30:00.000Z',
      openedAtEdited: true,
      closedAtEdited: false,
    });
  });

  it('holds a scaled exit as one Trade, at its weighted average, flagged', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      // Half out at $108, half at $112: one Trade at $110, not two Trades.
      positionClosed({ at: closedAt, openedAt, exitPrice: 110, scaledOut: true }),
    ]);

    expect(state.trades).toHaveLength(1);
    expect(state.trades[0]).toMatchObject({ exitPrice: 110, scaledOut: true, realizedPnl: 24 });
  });

  it('keeps the notes written against the Trade', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      positionClosed({ at: closedAt, openedAt, notes: 'Took it early — bored, not stopped.' }),
    ]);

    expect(state.trades[0].notes).toBe('Took it early — bored, not stopped.');
  });

  it('leaves 1R at the Plan’s original Stop, whatever the Trade did', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      // Filled away from the Plan and closed for a multiple of the risk: 1R is
      // still the $10 committed at the original Stop (ADR-0001).
      positionClosed({ at: closedAt, openedAt, entryPrice: 101, exitPrice: 140 }),
    ]);

    expect(state.trades[0].plan.oneR).toBe(10);
    expect(state.trades[0].plan.stopPrice).toBe(96);
  });

  it('sizes the next Plan off the Balance the Trade produced', () => {
    const state = deriveState([
      ...lifecycle,
      planCreated({ at: '2026-01-04T09:00:00.000Z', id: 'plan-2' }),
    ]);

    // 2% of $524, not of the $500 the first Plan was sized against.
    expect(state.plans[1]).toMatchObject({ balanceAtCreation: 524, oneR: 10.48 });
  });

  it('refuses to fold a close against a Position that was never open', () => {
    expect(() => deriveState([funded, planned, positionClosed({ at: closedAt })])).toThrow(
      /plan-1/,
    );
  });
});

describe('abandoning a Plan', () => {
  const funded = deposit(500, '2026-01-01T09:00:00.000Z');
  const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
  const abandonedAt = '2026-01-02T09:05:00.000Z';
  const skipped = [funded, planned, planAbandoned({ at: abandonedAt, reason: 'price ran away' })];

  it('marks the Plan abandoned, for the reason it was skipped for', () => {
    expect(deriveState(skipped).plans[0]).toMatchObject({
      status: 'abandoned',
      abandonReason: 'price ran away',
    });
  });

  it('leaves a Plan nobody skipped without a reason', () => {
    expect(deriveState([funded, planned]).plans[0].abandonReason).toBeNull();
  });

  it('keeps the Abandoned Plan on the record, figures and all', () => {
    const state = deriveState(skipped);

    expect(state.plans).toHaveLength(1);
    expect(state.plans[0]).toMatchObject({ oneR: 10, notional: 250, balanceAtCreation: 500 });
  });

  it('opens no Position and produces no Trade', () => {
    const state = deriveState(skipped);

    expect(state.openPositions).toEqual([]);
    expect(state.trades).toEqual([]);
  });

  it('moves no Balance and writes nothing to the Ledger', () => {
    const state = deriveState(skipped);

    // The skip is the whole point: what was not traded cannot have cost or
    // made anything, so it must not reach the Ledger the Balance folds from.
    expect(state.balance).toBe(500);
    expect(state.ledger).toHaveLength(1);
  });

  it('sizes the next Plan off a Balance the skip left untouched', () => {
    const state = deriveState([
      ...skipped,
      planCreated({ at: '2026-01-03T09:00:00.000Z', id: 'plan-2' }),
    ]);

    expect(state.plans[1]).toMatchObject({ balanceAtCreation: 500, oneR: 10 });
  });

  it('counts toward nothing a Trade counts toward', () => {
    const state = deriveState([
      ...skipped,
      planCreated({ at: '2026-01-03T09:00:00.000Z', id: 'plan-2' }),
      positionOpened('2026-01-03T10:00:00.000Z', 'plan-2'),
      positionClosed({ at: '2026-01-03T15:00:00.000Z', planId: 'plan-2', openedAt: '2026-01-03T10:00:00.000Z' }),
    ]);

    // Two Plans on the record and one Trade among them — the closed-Trade
    // count that gates statistics, and every figure folded from it, sees the
    // Trade alone (ADR-0002).
    expect(state.plans).toHaveLength(2);
    expect(state.trades).toHaveLength(1);
  });

  it('refuses to fold a skip of a Plan that is live as a Position', () => {
    // The Position would go on running underneath a row saying it was never
    // taken, and the Trade it closes as would be a Trade on an Abandoned Plan.
    expect(() =>
      deriveState([
        funded,
        planned,
        positionOpened('2026-01-03T09:00:00.000Z'),
        planAbandoned({ at: '2026-01-03T10:00:00.000Z' }),
      ]),
    ).toThrow(/already open/);
  });

  it('refuses to fold a skip of a Plan that has already closed as a Trade', () => {
    expect(() =>
      deriveState([
        funded,
        planned,
        positionOpened('2026-01-03T09:00:00.000Z'),
        positionClosed({ at: '2026-01-03T15:00:00.000Z', openedAt: '2026-01-03T09:00:00.000Z' }),
        planAbandoned({ at: '2026-01-03T16:00:00.000Z' }),
      ]),
    ).toThrow(/already closed/);
  });

  it('refuses to fold a skip of a Plan that is not on the record', () => {
    expect(() => deriveState([funded, planAbandoned({ at: abandonedAt, planId: 'plan-9' })])).toThrow(
      /plan-9/,
    );
  });
});

describe('moving the Stop on an open Position', () => {
  const funded = deposit(500, '2026-01-01T09:00:00.000Z');
  const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
  const openedAt = '2026-01-03T09:00:00.000Z';
  const movedAt = '2026-01-03T11:00:00.000Z';
  const live = [funded, planned, positionOpened(openedAt)];

  it('stands the Stop where it was moved to, with the Plan’s original beside it', () => {
    const state = deriveState([...live, stopMoved({ at: movedAt, stopPrice: 98 })]);

    expect(state.openPositions[0]).toMatchObject({
      stopPrice: 98,
      plan: { stopPrice: 96 },
    });
  });

  it('stands the Stop at the Plan’s own until one has been moved', () => {
    expect(deriveState(live).openPositions[0]).toMatchObject({ stopPrice: 96, stopMoves: [] });
  });

  it('keeps every move, in the order they happened', () => {
    const state = deriveState([
      ...live,
      stopMoved({ at: movedAt, stopPrice: 98 }),
      stopMoved({ at: '2026-01-03T13:00:00.000Z', stopPrice: 100 }),
    ]);

    expect(state.openPositions[0].stopMoves).toEqual([
      { at: movedAt, stopPrice: 98 },
      { at: '2026-01-03T13:00:00.000Z', stopPrice: 100 },
    ]);
    expect(state.openPositions[0].stopPrice).toBe(100);
  });

  it('leaves 1R at the original Stop however many times the Stop moves (ADR-0001)', () => {
    const state = deriveState([
      ...live,
      stopMoved({ at: movedAt, stopPrice: 98 }),
      stopMoved({ at: '2026-01-03T13:00:00.000Z', stopPrice: 99.5 }),
      stopMoved({ at: '2026-01-03T14:00:00.000Z', stopPrice: 101 }),
    ]);

    expect(state.openPositions[0].plan).toMatchObject({ oneR: 10, stopPrice: 96, notional: 250 });
  });

  it('moves no Balance, because a Stop is not a fill', () => {
    const state = deriveState([...live, stopMoved({ at: movedAt, stopPrice: 98 })]);

    expect(state.balance).toBe(500);
    expect(state.ledger).toHaveLength(1);
  });

  it('carries a Violation from an overridden widening onto the Plan', () => {
    const violation = { ruleId: 'stop-never-widens' as const, reason: 'Real level is lower.' };
    const state = deriveState([
      ...live,
      stopMoved({ at: movedAt, stopPrice: 94, violations: [violation] }),
    ]);

    expect(state.plans[0].violations).toEqual([violation]);
    expect(state.openPositions[0].plan.violations).toEqual([violation]);
  });

  it('carries that Violation on through to the Trade the Position closed as', () => {
    const violation = { ruleId: 'stop-never-widens' as const, reason: 'Real level is lower.' };
    const state = deriveState([
      ...live,
      stopMoved({ at: movedAt, stopPrice: 94, violations: [violation] }),
      positionClosed({ at: '2026-01-03T15:00:00.000Z', openedAt }),
    ]);

    expect(state.trades[0].plan.violations).toEqual([violation]);
  });

  it('leaves nothing open once the Position it moved the Stop on has closed', () => {
    const state = deriveState([
      ...live,
      stopMoved({ at: movedAt, stopPrice: 98 }),
      positionClosed({ at: '2026-01-03T15:00:00.000Z', openedAt }),
    ]);

    expect(state.openPositions).toEqual([]);
  });

  it('refuses to fold a Stop move against a Position that was never open', () => {
    expect(() => deriveState([funded, planned, stopMoved({ at: movedAt })])).toThrow(/plan-1/);
  });

  it('refuses to fold a Stop move against a Plan that is not on the record', () => {
    expect(() => deriveState([funded, stopMoved({ at: movedAt, planId: 'plan-9' })])).toThrow(
      /plan-9/,
    );
  });
});
