import { describe, expect, it } from 'vitest';
import type { TradeTrackerEvent } from '../core/events';
import { deposit, planCreated } from '../test/events';
import type { EventStore } from './eventStore';

/**
 * Opens handles onto one isolated body of stored data. Opening twice models
 * closing and reopening the app: the second handle must see what the first
 * appended.
 */
/**
 * The stored log read back as Deposit amounts. Anything that came back as a
 * different kind of event surfaces whole, so the comparison fails loudly
 * rather than quietly dropping it.
 */
function amounts(events: readonly TradeTrackerEvent[]): unknown[] {
  return events.map((event) => (event.type === 'Deposit' ? event.amount : event));
}

export interface EventStoreFactory {
  open(): Promise<EventStore>;
}

/**
 * The contract every storage implementation owes the core. Run against the
 * in-memory store as well as IndexedDB: the UI tests trust the in-memory one,
 * so a fake that behaves differently is a lie about production.
 */
export function describeEventStoreContract(
  implementation: string,
  createFactory: () => EventStoreFactory,
): void {
  describe(`${implementation} event store`, () => {
    it('reads an empty log before anything is appended', async () => {
      const store = await createFactory().open();

      expect(await store.read()).toEqual([]);
    });

    it('reads back appended events in the order they were appended', async () => {
      const store = await createFactory().open();

      await store.append([
        deposit(500, '2026-01-01T09:00:00.000Z'),
        deposit(250, '2026-02-01T09:00:00.000Z'),
      ]);

      expect(amounts(await store.read())).toEqual([500, 250]);
    });

    it('keeps appends in order across separate calls', async () => {
      const store = await createFactory().open();

      await store.append([deposit(500, '2026-01-01T09:00:00.000Z')]);
      await store.append([deposit(250, '2026-02-01T09:00:00.000Z')]);
      await store.append([deposit(125, '2026-03-01T09:00:00.000Z')]);

      expect(amounts(await store.read())).toEqual([500, 250, 125]);
    });

    it('changes nothing when given an empty batch', async () => {
      const store = await createFactory().open();
      await store.append([deposit(500, '2026-01-01T09:00:00.000Z')]);

      await store.append([]);

      expect(amounts(await store.read())).toEqual([500]);
    });

    it('round-trips a Deposit unchanged', async () => {
      const store = await createFactory().open();
      const recorded = deposit(1234.56, '2026-05-04T12:30:00.000Z');

      await store.append([recorded]);

      expect(await store.read()).toEqual([recorded]);
    });

    it('round-trips a Plan unchanged', async () => {
      const store = await createFactory().open();
      // A Plan carries far more fields than a Deposit, and every one of them
      // feeds a figure solved from it — a field lost in storage is a wrong
      // Notional rather than a crash.
      const recorded = planCreated({
        at: '2026-05-04T12:30:00.000Z',
        direction: 'short',
        entryPrice: 1234.56,
        stopPrice: 1290.12,
        liquidationPrice: 1480,
        leverage: 7,
        riskFraction: 0.025,
      });

      await store.append([recorded]);

      expect(await store.read()).toEqual([recorded]);
    });

    it('shows a reopened store everything an earlier handle appended', async () => {
      const factory = createFactory();
      const first = await factory.open();
      await first.append([deposit(500, '2026-01-01T09:00:00.000Z')]);

      const reopened = await factory.open();

      expect(amounts(await reopened.read())).toEqual([500]);
    });

    it('keeps one body of data separate from another', async () => {
      const store = await createFactory().open();
      await store.append([deposit(500, '2026-01-01T09:00:00.000Z')]);

      const other = await createFactory().open();

      expect(await other.read()).toEqual([]);
    });
  });
}
