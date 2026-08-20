import { tradeLog } from './log';
import { deriveState } from './state';
import {
  deposit,
  planAbandoned,
  planCreated,
  positionClosed,
  positionOpened,
} from '../test/events';

const funded = deposit(500, '2026-01-01T09:00:00.000Z');

describe('the Trade log', () => {
  it('is empty until something has ended', () => {
    expect(tradeLog(deriveState([funded]))).toEqual([]);
  });

  it('holds a row for each Trade, with what it came to in R and what it kept', () => {
    const state = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened('2026-01-03T09:00:00.000Z'),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt: '2026-01-03T09:00:00.000Z',
        exitPrice: 110,
        bestPrice: 114,
        fees: 1,
      }),
    ]);

    expect(tradeLog(state)).toMatchObject([
      { kind: 'Trade', at: '2026-01-04T09:00:00.000Z', rMultiple: 2.4 },
    ]);
    expect(tradeLog(state)[0]).toMatchObject({ captureRate: 10 / 14 });
  });

  it('holds a row for each Abandoned Plan, carrying the Plan it was', () => {
    const state = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      planAbandoned({ at: '2026-01-02T09:05:00.000Z', reason: 'price ran away' }),
    ]);

    expect(tradeLog(state)).toMatchObject([
      {
        kind: 'Abandoned Plan',
        at: '2026-01-02T09:05:00.000Z',
        reason: 'price ran away',
        plan: { id: 'plan-1', oneR: 10 },
      },
    ]);
  });

  it('leaves out a Plan that has not ended, whether it is waiting or live', () => {
    const state = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z', id: 'plan-1' }),
      positionOpened('2026-01-03T09:00:00.000Z', 'plan-1'),
      planCreated({ at: '2026-01-04T09:00:00.000Z', id: 'plan-2' }),
    ]);

    expect(tradeLog(state)).toEqual([]);
  });

  it('reads newest first, Trades and Abandoned Plans in one sequence', () => {
    const state = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z', id: 'plan-1' }),
      positionOpened('2026-01-03T09:00:00.000Z', 'plan-1'),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        planId: 'plan-1',
        openedAt: '2026-01-03T09:00:00.000Z',
      }),
      planCreated({ at: '2026-01-05T09:00:00.000Z', id: 'plan-2' }),
      planAbandoned({ at: '2026-01-06T09:00:00.000Z', planId: 'plan-2' }),
    ]);

    expect(tradeLog(state).map((row) => row.kind)).toEqual(['Abandoned Plan', 'Trade']);
  });

  it('sits a Trade where it closed rather than where it was written down', () => {
    // Logged two days late and the close time corrected, which is the whole
    // reason the timestamp is editable: the history has to read in the order
    // things actually happened, not the order they were typed up in.
    const state = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z', id: 'plan-1' }),
      positionOpened('2026-01-03T09:00:00.000Z', 'plan-1'),
      planCreated({ at: '2026-01-05T09:00:00.000Z', id: 'plan-2' }),
      planAbandoned({ at: '2026-01-06T09:00:00.000Z', planId: 'plan-2' }),
      positionClosed({
        at: '2026-01-08T09:00:00.000Z',
        planId: 'plan-1',
        openedAt: '2026-01-03T09:00:00.000Z',
        closedAt: '2026-01-04T09:00:00.000Z',
      }),
    ]);

    expect(tradeLog(state).map((row) => row.at)).toEqual([
      '2026-01-06T09:00:00.000Z',
      '2026-01-04T09:00:00.000Z',
    ]);
  });

  it('reports a Trade that had no move available as having no Capture Rate', () => {
    const state = deriveState([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened('2026-01-03T09:00:00.000Z'),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt: '2026-01-03T09:00:00.000Z',
        exitPrice: 96,
        bestPrice: 100,
        exitReason: 'stop hit',
      }),
    ]);

    expect(tradeLog(state)[0]).toMatchObject({ captureRate: null });
  });
});
