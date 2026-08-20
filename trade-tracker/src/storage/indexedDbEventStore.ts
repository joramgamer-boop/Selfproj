import type { TradeTrackerEvent } from '../core/events';
import type { EventStore } from './eventStore';

/**
 * Production storage. IndexedDB rather than localStorage because Evidence
 * screenshots are hundreds of kilobytes each and would fill localStorage within
 * ten Trades.
 */
const DATABASE_VERSION = 2;
const EVENTS = 'events';
const EVIDENCE = 'evidence';

export const DEFAULT_DATABASE_NAME = 'trade-tracker';

/**
 * A screenshot as it is stored: the bytes, and the type that says what kind of
 * picture they are.
 *
 * Bytes rather than the Blob itself, even though IndexedDB can hold one.
 * `fake-indexeddb` — the only implementation this project can run the storage
 * contract against — does not survive a Blob: one written and read back comes
 * out as a plain object with neither its bytes nor its type. Keeping Blobs
 * would leave the round-trip that matters most untestable until a phone lost a
 * screenshot, which is exactly the failure the contract exists to catch.
 */
interface StoredImage {
  readonly type: string;
  readonly bytes: ArrayBuffer;
}

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
      // One transaction for the batch, so a half-written command cannot
      // survive a crash and corrupt every Balance derived after it.
      await writing(db, EVENTS, (store) => events.forEach((event) => store.add(event)));
    },

    putEvidence: async (id, image) => {
      const stored: StoredImage = { type: image.type, bytes: await image.arrayBuffer() };
      const db = await database();
      // Put rather than add: an id comes from the same source a Plan id does
      // and will not repeat, but a retry of the same write must not fail.
      await writing(db, EVIDENCE, (store) => store.put(stored, id));
    },

    readEvidence: async (id) => {
      const db = await database();
      const stored = await promised<StoredImage | undefined>((resolve, reject) => {
        const request = db.transaction(EVIDENCE, 'readonly').objectStore(EVIDENCE).get(id);
        request.onsuccess = () => resolve(request.result as StoredImage | undefined);
        request.onerror = () => reject(request.error);
      });

      return stored === undefined ? null : new Blob([stored.bytes], { type: stored.type });
    },

    deleteEvidence: async (id) => {
      const db = await database();
      await writing(db, EVIDENCE, (store) => store.delete(id));
    },
  };
}

/**
 * One write, resolved when the transaction has actually committed rather than
 * when the request came back. The difference is the whole point: a request
 * that succeeded inside a transaction that later aborted wrote nothing.
 */
function writing(
  db: IDBDatabase,
  storeName: string,
  write: (store: IDBObjectStore) => void,
): Promise<void> {
  return promised<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    write(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return promised<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Each store created only if it is missing, so a phone that already
      // holds a log opens at the new version with the log still in it.
      if (!db.objectStoreNames.contains(EVENTS)) {
        // Auto-incrementing keys give us append order for free, which is the
        // only ordering the fold cares about.
        db.createObjectStore(EVENTS, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(EVIDENCE)) {
        // Keyed by the id the events name, and by nothing else: a screenshot
        // is fetched only when the Trade holding it is opened.
        db.createObjectStore(EVIDENCE);
      }
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
