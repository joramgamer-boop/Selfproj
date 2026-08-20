import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { createIndexedDbEventStore } from './indexedDbEventStore';
import { deposit, screenshot } from '../test/events';

/**
 * The one thing the shared contract cannot ask about: what happens to a phone
 * that already holds a log when the database version moves.
 *
 * Evidence arrived after the Ledger did, so every installed copy of this app
 * has a version 1 database with events in it and no place to put a screenshot.
 * An upgrade that recreated the stores would open cleanly onto an empty
 * Ledger — silent, total data loss, and exactly the failure this project
 * treats as catastrophic.
 */
it('opens a database written before Evidence existed, with the log still in it', async () => {
  const databaseName = 'trade-tracker-upgrade';
  const before = deposit(500, '2026-01-01T09:00:00.000Z');

  // Version 1 exactly as the app used to write it: an events store, nothing else.
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('events', { autoIncrement: true });
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('events', 'readwrite');
      transaction.objectStore('events').add(before);
      transaction.oncomplete = () => {
        // Closed, because an open connection at the old version blocks the
        // upgrade rather than failing it.
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
    request.onerror = () => reject(request.error);
  });

  const store = createIndexedDbEventStore(databaseName);

  expect(await store.read()).toEqual([before]);
  // And the new store is there to be written to.
  await store.putEvidence('shot-1', screenshot());
  expect(await store.readEvidence('shot-1')).not.toBeNull();
});
