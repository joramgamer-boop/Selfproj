import type { TradeTrackerEvent } from '../core/events';
import type { EventStore } from './eventStore';

/**
 * Production storage. IndexedDB rather than localStorage because Evidence
 * screenshots are hundreds of kilobytes each and would fill localStorage within
 * ten Trades.
 */
const DATABASE_VERSION = 1;
const EVENTS = 'events';

export const DEFAULT_DATABASE_NAME = 'trade-tracker';

export function createIndexedDbEventStore(
  databaseName: string = DEFAULT_DATABASE_NAME,
): EventStore {
  let connection: Promise<IDBDatabase> | undefined;

  const database = () => (connection ??= openDatabase(databaseName));

  return {
    read: async () => {
      const db = await database();
      return await promised<TradeTrackerEvent[]>((resolve, reject) => {
        const request = db.transaction(EVENTS, 'readonly').objectStore(EVENTS).getAll();
        request.onsuccess = () => resolve(request.result as TradeTrackerEvent[]);
        request.onerror = () => reject(request.error);
      });
    },

    append: async (events) => {
      if (events.length === 0) return;

      const db = await database();
      await promised<void>((resolve, reject) => {
        // One transaction for the batch, so a half-written command cannot
        // survive a crash and corrupt every Balance derived after it.
        const transaction = db.transaction(EVENTS, 'readwrite');
        const store = transaction.objectStore(EVENTS);
        events.forEach((event) => store.add(event));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    },
  };
}

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return promised<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      // Auto-incrementing keys give us append order for free, which is the only
      // ordering the fold cares about.
      request.result.createObjectStore(EVENTS, { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promised<T>(
  start: (resolve: (value: T) => void, reject: (error: unknown) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    start(resolve, (error) => reject(error instanceof Error ? error : new Error(String(error))));
  });
}
