import { deriveState } from './state';
import { deposit } from '../test/events';

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
