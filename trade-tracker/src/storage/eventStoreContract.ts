import { describe, expect, it } from 'vitest';
import type { TradeTrackerEvent } from '../core/events';
import {
  bytesOf,
  deposit,
  evidenceAttached,
  planCreated,
  positionClosed,
  screenshot,
} from '../test/events';
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

    it('round-trips a closed Trade unchanged', async () => {
      const store = await createFactory().open();
      // The close carries the whole record of what happened — prices, fees,
      // flags, the reason and the notes. Losing any of it silently is how a
      // Trade comes back as a different Trade.
      const recorded = positionClosed({
        at: '2026-05-04T12:30:00.000Z',
        openedAt: '2026-05-04T09:15:00.000Z',
        closedAt: '2026-05-04T12:25:00.000Z',
        entryPrice: 1234.56,
        exitPrice: 1301.4,
        bestPrice: 1355,
        fees: 0.87,
        exitReason: 'manual exit in profit',
        scaledIn: true,
        scaledOut: true,
        notes: 'Took half at the first target.',
      });

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

    it('round-trips a Trade with its screenshot attached', async () => {
      const factory = createFactory();
      const store = await factory.open();
      const image = screenshot([137, 80, 78, 71, 13, 10, 26, 10]);
      const closed = positionClosed({
        at: '2026-05-04T12:30:00.000Z',
        openedAt: '2026-05-04T09:15:00.000Z',
        closedAt: '2026-05-04T12:25:00.000Z',
      });

      // In the order the app writes them: the image first, so a stored Trade
      // never names proof the store cannot produce.
      await store.putEvidence('shot-1', image);
      await store.append([closed, evidenceAttached({ at: '2026-05-04T12:31:00.000Z' })]);

      // Reopened, because the failure this guards against is the one that only
      // shows up after the app is closed and the phone put away.
      const reopened = await factory.open();
      expect(await reopened.read()).toEqual([
        closed,
        evidenceAttached({ at: '2026-05-04T12:31:00.000Z' }),
      ]);
      const stored = await reopened.readEvidence('shot-1');
      expect(stored).not.toBeNull();
      expect(await bytesOf(stored!)).toEqual(await bytesOf(image));
      // The type comes back too: without it the Trade detail has nothing to
      // tell the browser what kind of picture it is holding.
      expect(stored!.type).toBe('image/png');
    });

    it('has no screenshot under an id nothing was stored against', async () => {
      const store = await createFactory().open();

      expect(await store.readEvidence('shot-1')).toBeNull();
    });

    it('keeps one screenshot apart from another', async () => {
      const store = await createFactory().open();

      await store.putEvidence('shot-1', screenshot([1, 2, 3]));
      await store.putEvidence('shot-2', screenshot([9, 9]));

      expect(await bytesOf((await store.readEvidence('shot-1'))!)).toEqual(
        new Uint8Array([1, 2, 3]),
      );
      expect(await bytesOf((await store.readEvidence('shot-2'))!)).toEqual(new Uint8Array([9, 9]));
    });

    it('gives up a screenshot that was removed, and says nothing when asked twice', async () => {
      const factory = createFactory();
      const store = await factory.open();
      await store.putEvidence('shot-1', screenshot());

      await store.deleteEvidence('shot-1');
      // Removing what is already gone is not an error: the app gives up a
      // replaced screenshot after the event is down, and may be asked to do it
      // again by a retry that finds nothing left.
      await store.deleteEvidence('shot-1');

      expect(await (await factory.open()).readEvidence('shot-1')).toBeNull();
    });

    it('keeps one body of screenshots separate from another', async () => {
      const store = await createFactory().open();
      await store.putEvidence('shot-1', screenshot());

      const other = await createFactory().open();

      expect(await other.readEvidence('shot-1')).toBeNull();
    });

    it('keeps one body of data separate from another', async () => {
      const store = await createFactory().open();
      await store.append([deposit(500, '2026-01-01T09:00:00.000Z')]);

      const other = await createFactory().open();

      expect(await other.read()).toEqual([]);
    });
  });
}
